import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { TYPE_OF } from '../accounts/accounts.codes.js';
import type { SaveVoucherDto } from './dto/save-voucher.dto.js';
import {
  BANK_TYPE,
  CASH_TYPE,
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
