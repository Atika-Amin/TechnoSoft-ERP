import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { TYPE_OF } from '../accounts/accounts.codes.js';
import type { JournalLineDto, SaveJournalDto } from './dto/save-journal.dto.js';
import type { SaveVoucherDto } from './dto/save-voucher.dto.js';
import {
  BANK_TYPE,
  CASH_TYPE,
  JOURNAL,
  LEDGER_LEVEL,
  NO_PROJECT,
  TYPE_INFO,
  VOUCHER_TYPES,
  type VoucherType,
} from './vouchers.constants.js';
import { VouchersRepository, type VoucherFilter } from './vouchers.repository.js';

const pad5 = (n: number | string) => String(n).padStart(5, '0');
const toIsoDate = (d: Date) => d.toISOString().slice(0, 10);
const money = (n: number) => n.toLocaleString('en-IN', { minimumFractionDigits: 2 });

// "2026-2027" → 1 Jul 2026 … 30 Jun 2027 (Bangladesh fiscal year)
export function fiscalYear(workingYear: string) {
  const start = Number(workingYear.slice(0, 4));
  return {
    from: new Date(Date.UTC(start, 6, 1)),
    to: new Date(Date.UTC(start + 1, 5, 30)),
    label: `1 Jul ${start} – 30 Jun ${start + 1}`,
  };
}
type FiscalYear = ReturnType<typeof fiscalYear>;

// Business logic layer for vouchers
@Injectable()
export class VouchersService {
  constructor(private readonly repo: VouchersRepository) {}

  // Everything the voucher screen needs to fill its dropdowns (FoxPro form Load + Init)
  async setup() {
    const [ledgers, jobs] = await Promise.all([this.repo.findLedgers(), this.repo.findProjects()]);
    // Sub group names, so the account search can show where each ledger belongs
    const parents = await this.repo.findAccountsByCodes([...new Set(ledgers.map((l) => l.parentCode))]);
    const parentName = new Map(parents.map((p) => [p.code, p.name]));
    return {
      ledgers: ledgers.map((l) => ({
        code: l.code,
        name: l.name,
        ledgerType: TYPE_OF[l.ledgerType],
        groupName: parentName.get(l.parentCode) ?? '',
      })),
      jobs: jobs.map((j) => ({ code: j.code, name: j.name, accountCode: j.accountCode, isDefault: j.isDefault === 1 })),
    };
  }

  async nextNumber(type: string, bankCode: string | undefined, fy: FiscalYear) {
    const t = this.parseType(type);
    if (TYPE_INFO[t].isBank && !bankCode) throw new BadRequestException('Choose a bank first');
    const last = await this.repo.lastVoucherNo(t, fy.from, fy.to, this.bankSide(t, bankCode));
    const next = last ? Number(last.slice(2)) + 1 : 1;
    return { voucherNo: t + pad5(next) };
  }

  // FoxPro: loads an existing voucher into the grid for editing
  async find(voucherNo: string, bankCode: string | undefined, fy: FiscalYear) {
    const vno = voucherNo.toUpperCase();
    const type = this.parseType(vno.slice(0, 2));
    const info = TYPE_INFO[type];
    const rows = await this.repo.findRows({ voucherNo: vno, from: fy.from, to: fy.to, bank: this.bankSide(type, bankCode) });
    if (rows.length === 0) throw new NotFoundException(`Voucher ${vno} was not found in this working year`);

    // Payments: lines are on the debit side. Receipts: lines are on the credit side.
    const lineCode = (r: (typeof rows)[number]) => (info.isPayment ? r.debitCode : r.creditCode);
    const counterCode = info.isPayment ? rows[0].creditCode : rows[0].debitCode;

    const [accounts, jobs] = await Promise.all([
      this.repo.findAccountsByCodes([...new Set(rows.map(lineCode))]),
      this.repo.findProjects(),
    ]);
    const nameOf = new Map(accounts.map((a) => [a.code, a.name]));
    const jobOf = new Map(jobs.map((j) => [j.code, j.name]));

    return {
      type,
      voucherNo: vno,
      date: toIsoDate(rows[0].date),
      accountCode: counterCode,
      lines: rows.map((r) => ({
        accountCode: lineCode(r),
        accountName: nameOf.get(lineCode(r)) ?? '',
        amount: r.amount.toNumber(),
        remarks: r.debitRemark,
        jobCode: r.jobCode || null,
        jobName: jobOf.get(r.jobCode) ?? '',
      })),
    };
  }

  async create(dto: SaveVoucherDto, fy: FiscalYear) {
    const info = TYPE_INFO[dto.type];
    const bank = this.bankSide(dto.type, dto.accountCode);

    let voucherNo: string;
    if (dto.number) {
      voucherNo = dto.type + pad5(Number(dto.number));
      const existing = await this.repo.findRows({ voucherNo, from: fy.from, to: fy.to, bank });
      if (existing.length) {
        throw new ConflictException(`${voucherNo} already exists. Open it to edit it, or use another number`);
      }
    } else {
      voucherNo = (await this.nextNumber(dto.type, dto.accountCode, fy)).voucherNo;
    }

    const rows = await this.buildRows(dto, voucherNo, fy);
    await this.repo.replace(null, rows);
    return this.summary(voucherNo, info.label, rows);
  }

  async update(voucherNo: string, dto: SaveVoucherDto, fy: FiscalYear) {
    const vno = voucherNo.toUpperCase();
    if (!vno.startsWith(dto.type)) throw new BadRequestException(`${vno} is not a ${TYPE_INFO[dto.type].label} voucher`);

    const filter: VoucherFilter = { voucherNo: vno, from: fy.from, to: fy.to, bank: this.bankSide(dto.type, dto.accountCode) };
    const existing = await this.repo.findRows(filter);
    if (!existing.length) throw new NotFoundException(`Voucher ${vno} was not found in this working year`);

    const rows = await this.buildRows(dto, vno, fy);
    await this.repo.replace(filter, rows);
    return this.summary(vno, TYPE_INFO[dto.type].label, rows);
  }

  // Checks every rule and turns the grid into trction rows (FoxPro Save button)
  private async buildRows(dto: SaveVoucherDto, voucherNo: string, fy: FiscalYear) {
    const info = TYPE_INFO[dto.type];

    const date = new Date(`${dto.date}T00:00:00Z`);
    if (date < fy.from || date > fy.to) {
      throw new BadRequestException(`Date must be inside the working year (${fy.label})`);
    }

    // Cash / bank account
    const lineCodes = dto.lines.map((l) => l.accountCode);
    const accounts = await this.repo.findAccountsByCodes([...new Set([dto.accountCode, ...lineCodes])]);
    const accountOf = new Map(accounts.map((a) => [a.code, a]));

    const counter = accountOf.get(dto.accountCode);
    const neededType = info.isBank ? BANK_TYPE : CASH_TYPE;
    if (!counter || counter.level !== LEDGER_LEVEL || counter.ledgerType !== neededType) {
      throw new BadRequestException(`Choose a ${info.isBank ? 'bank' : 'cash'} ledger`);
    }

    // Lines
    const jobs = new Map((await this.repo.findProjects()).map((j) => [j.code, j]));
    const dateVoucherNo = dto.date.replaceAll('-', '') + voucherNo; // FoxPro: dtos(date) + voucher

    return dto.lines.map((line, i) => {
      const account = accountOf.get(line.accountCode);
      if (!account || account.level !== LEDGER_LEVEL) {
        throw new BadRequestException(`Line ${i + 1}: account ${line.accountCode} is not a ledger`);
      }
      if (account.code === counter.code) {
        throw new BadRequestException(`Line ${i + 1}: cannot use ${counter.name} on both sides`);
      }

      const job = line.jobCode ? jobs.get(line.jobCode) : undefined;
      if (line.jobCode && !job) throw new BadRequestException(`Line ${i + 1}: project ${line.jobCode} not found`);
      const projectAccount = job?.accountCode ?? '';
      const remarks = line.remarks?.trim() ?? '';

      return {
        date,
        voucherNo,
        debitCode: info.isPayment ? account.code : counter.code,
        creditCode: info.isPayment ? counter.code : account.code,
        amount: line.amount,
        jobCode: job?.code ?? '',
        debitRemark: remarks,
        creditRemark: remarks,
        dateVoucherNo,
        debitProject: info.isPayment && projectAccount ? projectAccount : NO_PROJECT,
        creditProject: !info.isPayment && projectAccount ? projectAccount : NO_PROJECT,
        type: info.vtype,
        project: projectAccount,
      };
    });
  }

  // ── Journal voucher ──────────────────────────────────────────────

  async nextJournalNo(date: string, fy: FiscalYear) {
    const day = this.dayInYear(date, fy);
    const last = await this.repo.lastVoucherNo(JOURNAL.prefix, day, day);
    const next = last ? Number(last.slice(2)) + 1 : 1;
    return { voucherNo: JOURNAL.prefix + pad5(next) };
  }

  // FoxPro jvtxt: rebuild the grid from the trction pairs of one journal (number + date)
  async findJournal(voucherNo: string, date: string, fy: FiscalYear) {
    const vno = voucherNo.toUpperCase();
    const day = this.dayInYear(date, fy);
    const rows = await this.repo.findRows({ voucherNo: vno, from: day, to: day });
    if (!rows.length) throw new NotFoundException(`Journal ${vno} was not found on ${date}`);

    const [accounts, jobs] = await Promise.all([
      this.repo.findAccountsByCodes([...new Set(rows.flatMap((r) => [r.debitCode, r.creditCode]))]),
      this.repo.findProjects(),
    ]);
    const nameOf = new Map(accounts.map((a) => [a.code, a.name]));
    const jobByAccount = new Map(jobs.map((j) => [j.accountCode, j.code])); // project ledger → job
    const jobOn = (projectAccount: string) => jobByAccount.get(projectAccount) ?? null;
    const line = (code: string, debit: number, credit: number, remarks: string, jobCode: string | null) => ({
      accountCode: code,
      accountName: nameOf.get(code) ?? '',
      debit,
      credit,
      remarks,
      jobCode,
    });

    // Which side holds the single account? (one debit → many credits, or many debits → one credit)
    const first = rows[0];
    const sameDebit = rows.every((r) => r.debitCode === first.debitCode);
    const sameCredit = rows.every((r) => r.creditCode === first.creditCode);
    const total = rows.reduce((s, r) => s + r.amount.toNumber(), 0);

    let lines;
    if (sameDebit) {
      // one debit, several credits
      lines = [
        line(first.debitCode, total, 0, first.debitRemark, jobOn(first.debitProject)),
        ...rows.map((r) => line(r.creditCode, 0, r.amount.toNumber(), r.creditRemark, jobOn(r.creditProject))),
      ];
    } else if (sameCredit) {
      // several debits, one credit
      lines = [
        ...rows.map((r) => line(r.debitCode, r.amount.toNumber(), 0, r.debitRemark, jobOn(r.debitProject))),
        line(first.creditCode, 0, total, first.creditRemark, jobOn(first.creditProject)),
      ];
    } else {
      // Older data that doesn't follow the pattern: show each pair as a debit line + a credit line
      lines = rows.flatMap((r) => [
        line(r.debitCode, r.amount.toNumber(), 0, r.debitRemark, jobOn(r.debitProject)),
        line(r.creditCode, 0, r.amount.toNumber(), r.creditRemark, jobOn(r.creditProject)),
      ]);
    }

    return { voucherNo: vno, date: toIsoDate(first.date), lines };
  }

  async createJournal(dto: SaveJournalDto, fy: FiscalYear) {
    const day = this.dayInYear(dto.date, fy);
    let voucherNo: string;
    if (dto.number) {
      voucherNo = JOURNAL.prefix + pad5(Number(dto.number));
      const existing = await this.repo.findRows({ voucherNo, from: day, to: day });
      if (existing.length) {
        throw new ConflictException(`${voucherNo} already exists on ${dto.date}. Open it to edit it, or use another number`);
      }
    } else {
      voucherNo = (await this.nextJournalNo(dto.date, fy)).voucherNo;
    }

    const rows = await this.buildJournalRows(dto, voucherNo, day);
    await this.repo.replace(null, rows);
    return this.summary(voucherNo, JOURNAL.label, rows);
  }

  async updateJournal(voucherNo: string, dto: SaveJournalDto, fy: FiscalYear) {
    const vno = voucherNo.toUpperCase();
    const day = this.dayInYear(dto.date, fy);
    const filter: VoucherFilter = { voucherNo: vno, from: day, to: day }; // FoxPro: voucher == actvoucher .and. vdate == thisdate
    if (!(await this.repo.findRows(filter)).length) {
      throw new NotFoundException(`Journal ${vno} was not found on ${dto.date}`);
    }
    const rows = await this.buildJournalRows(dto, vno, day);
    await this.repo.replace(filter, rows);
    return this.summary(vno, JOURNAL.label, rows);
  }

  // FoxPro post(): one side has a single account; every line on the other side becomes one trction row
  private async buildJournalRows(dto: SaveJournalDto, voucherNo: string, day: Date) {
    const cents = (n: number) => Math.round(n * 100);

    dto.lines.forEach((l, i) => {
      if ((l.debit > 0) === (l.credit > 0)) {
        throw new BadRequestException(`Line ${i + 1}: enter either a debit or a credit amount`);
      }
    });
    const debits = dto.lines.filter((l) => l.debit > 0);
    const credits = dto.lines.filter((l) => l.credit > 0);
    if (!debits.length || !credits.length) {
      throw new BadRequestException('A journal needs at least one debit line and one credit line');
    }

    const totalDebit = debits.reduce((s, l) => s + cents(l.debit), 0);
    const totalCredit = credits.reduce((s, l) => s + cents(l.credit), 0);
    if (totalDebit !== totalCredit) {
      throw new BadRequestException(
        `Debit (${money(totalDebit / 100)}) and credit (${money(totalCredit / 100)}) totals must be equal`,
      );
    }

    // The rule that keeps every trction pair true. Remove this check later to allow many-to-many journals.
    if (debits.length > 1 && credits.length > 1) {
      throw new BadRequestException(
        'One side must have a single account: one debit with several credits, or several debits with one credit',
      );
    }

    // Accounts must be ledgers
    const accounts = await this.repo.findAccountsByCodes([...new Set(dto.lines.map((l) => l.accountCode))]);
    const accountOf = new Map(accounts.map((a) => [a.code, a]));
    dto.lines.forEach((l, i) => {
      const a = accountOf.get(l.accountCode);
      if (!a || a.level !== LEDGER_LEVEL) throw new BadRequestException(`Line ${i + 1}: account ${l.accountCode} is not a ledger`);
    });

    const jobs = new Map((await this.repo.findProjects()).map((j) => [j.code, j]));
    const jobOf = (l: JournalLineDto, i: number) => {
      if (!l.jobCode) return undefined;
      const job = jobs.get(l.jobCode);
      if (!job) throw new BadRequestException(`Line ${i + 1}: project ${l.jobCode} not found`);
      return job;
    };

    const singleIsDebit = debits.length === 1;
    const single = singleIsDebit ? debits[0] : credits[0];
    const many = singleIsDebit ? credits : debits;
    const singleJob = jobOf(single, dto.lines.indexOf(single));
    const dateVoucherNo = dto.date.replaceAll('-', '') + voucherNo;

    return many.map((m) => {
      const i = dto.lines.indexOf(m);
      if (m.accountCode === single.accountCode) {
        throw new BadRequestException(`Line ${i + 1}: the same account cannot be on both sides`);
      }
      const manyJob = jobOf(m, i);
      const debitLine = singleIsDebit ? single : m;
      const creditLine = singleIsDebit ? m : single;
      const debitJob = singleIsDebit ? singleJob : manyJob;
      const creditJob = singleIsDebit ? manyJob : singleJob;
      const rowJob = manyJob ?? singleJob;

      return {
        date: day,
        voucherNo,
        debitCode: debitLine.accountCode,
        creditCode: creditLine.accountCode,
        amount: singleIsDebit ? m.credit : m.debit,
        jobCode: rowJob?.code ?? '',
        debitRemark: debitLine.remarks?.trim() ?? '',
        creditRemark: creditLine.remarks?.trim() ?? '',
        dateVoucherNo,
        debitProject: debitJob?.accountCode ?? NO_PROJECT,
        creditProject: creditJob?.accountCode ?? NO_PROJECT,
        type: JOURNAL.vtype,
        project: rowJob?.accountCode ?? '',
      };
    });
  }

  // FoxPro text2.Valid: "Date is not in Fiscal Year"
  private dayInYear(date: string, fy: FiscalYear) {
    const day = new Date(`${date}T00:00:00Z`);
    if (Number.isNaN(day.getTime())) throw new BadRequestException('Date must be a valid date');
    if (day < fy.from || day > fy.to) throw new BadRequestException(`Date must be inside the working year (${fy.label})`);
    return day;
  }

  private summary(voucherNo: string, label: string, rows: { amount: number }[]) {
    const total = rows.reduce((sum, r) => sum + r.amount, 0);
    return { voucherNo, label, lines: rows.length, total, message: `${label} ${voucherNo} saved · ৳ ${money(total)}` };
  }

  // Cheque vouchers are numbered per bank: BP looks at the credit side, BR at the debit side
  private bankSide(type: VoucherType, bankCode?: string): VoucherFilter['bank'] {
    if (!TYPE_INFO[type].isBank || !bankCode) return undefined;
    return TYPE_INFO[type].isPayment ? { creditCode: bankCode } : { debitCode: bankCode };
  }

  private parseType(type: string): VoucherType {
    const t = type?.toUpperCase() as VoucherType;
    if (!VOUCHER_TYPES.includes(t)) throw new BadRequestException(`Unknown voucher type "${type}"`);
    return t;
  }
}
