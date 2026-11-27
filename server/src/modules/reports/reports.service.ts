import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { LEVEL_OF, NATURE_OF, TYPE_OF } from '../accounts/accounts.codes.js';
import { ReportsRepository } from './reports.repository.js';

// ── Helpers ────────────────────────────────────────────────────────
const round2 = (n: number) => Math.round(n * 100) / 100;

// Old system rule: Assets (1) and Expense (4) are debit-natured; Liability (2) and Income (3) credit-natured.
// op_bal is stored as a positive amount on the account's natural side.
const isDebitNatured = (nature: number) => nature === 1 || nature === 4;

// Work in "signed debit": positive = Dr, negative = Cr
const openingSigned = (nature: number, opBal: number) => (isDebitNatured(nature) ? opBal : -opBal);

const balance = (signed: number) => {
  const amount = round2(Math.abs(signed));
  return { amount, side: amount === 0 ? '' : signed > 0 ? 'Dr' : 'Cr' };
};

// Same-day order used by the old reports (vserial): BR, CR, BP, CP, then JR
const TYPE_ORDER: Record<number, number> = { 5: 1, 2: 2, 4: 3, 1: 4, 6: 5 };

const parseDate = (value: string, label: string) => {
  const d = new Date(`${value}T00:00:00Z`);
  if (!value || Number.isNaN(d.getTime())) throw new BadRequestException(`${label} must be a valid date`);
  return d;
};
const isoDate = (d: Date) => d.toISOString().slice(0, 10);

type AccountRow = Awaited<ReturnType<ReportsRepository['findAllAccounts']>>[number];
type Totals = Awaited<ReturnType<ReportsRepository['totalsAll']>>;

// lcodes.tmpa → section of the final accounts
const STATEMENT_SECTION: Record<number, 'TRADING' | 'MANUFACTURING' | 'PROFIT_LOSS' | 'APPROPRIATION'> = {
  1: 'TRADING',
  2: 'MANUFACTURING',
  3: 'PROFIT_LOSS',
  4: 'APPROPRIATION',
};

// Business layer: every report calculation lives here
@Injectable()
export class ReportsService {
  constructor(private readonly repo: ReportsRepository) {}

  private range(from: string, to: string) {
    const start = parseDate(from, 'Start date');
    const end = parseDate(to, 'End date');
    if (start > end) throw new BadRequestException('Start date must be before the end date');
    return { start, end };
  }

  // Lists for the report pickers
  async options() {
    const accounts = await this.repo.findOptions();
    const nameOf = new Map(accounts.map((a) => [a.code, a.name]));
    return accounts.map((a) => ({
      code: a.code,
      name: a.name,
      level: LEVEL_OF[a.level],
      nature: NATURE_OF[a.nature],
      ledgerType: TYPE_OF[a.ledgerType],
      groupName: nameOf.get(a.parentCode) ?? '',
    }));
  }

  // FoxPro indled + indledsort: one ledger with running balance.
  // Also used for the Cash book and Bank book (the page groups the lines by day).
  async ledger(code: string, from: string, to: string) {
    const { start, end } = this.range(from, to);
    const account = await this.repo.findAccount(code);
    if (!account || LEVEL_OF[account.level] !== 'LEDGER') throw new NotFoundException(`Ledger ${code} not found`);

    const before = await this.repo.totalsBefore(code, start);
    const opening = openingSigned(account.nature, account.openingBalance.toNumber()) + before.debit - before.credit;

    const rows = (await this.repo.findMovements(code, start, end)).sort(
      (a, b) =>
        a.date.getTime() - b.date.getTime() ||
        (TYPE_ORDER[a.type] ?? 9) - (TYPE_ORDER[b.type] ?? 9) ||
        a.voucherNo.localeCompare(b.voucherNo) ||
        a.id - b.id,
    );

    const others = await this.repo.findAccountsByCodes([
      ...new Set(rows.map((r) => (r.debitCode === code ? r.creditCode : r.debitCode))),
    ]);
    const nameOf = new Map(others.map((a) => [a.code, a.name]));

    let running = opening;
    let totalDebit = 0;
    let totalCredit = 0;
    const lines = rows.map((r) => {
      const isDebit = r.debitCode === code;
      const amount = r.amount.toNumber();
      const otherCode = isDebit ? r.creditCode : r.debitCode;
      running += isDebit ? amount : -amount;
      if (isDebit) totalDebit += amount;
      else totalCredit += amount;
      return {
        date: isoDate(r.date),
        voucherNo: r.voucherNo,
        type: r.type,
        otherCode,
        otherName: nameOf.get(otherCode) ?? otherCode,
        remarks: isDebit ? r.debitRemark : r.creditRemark,
        debit: isDebit ? amount : 0,
        credit: isDebit ? 0 : amount,
        balance: balance(running),
      };
    });

    return {
      account: { code: account.code, name: account.name, nature: NATURE_OF[account.nature], ledgerType: TYPE_OF[account.ledgerType] },
      from,
      to,
      opening: balance(opening),
      lines,
      totals: { debit: round2(totalDebit), credit: round2(totalCredit) },
      closing: balance(running),
    };
  }

  // FoxPro subgroupledsum + grpled: every ledger of a sub group with opening, debit, credit, balance
  async subGroup(code: string, from: string, to: string) {
    const { start, end } = this.range(from, to);
    const group = await this.repo.findAccount(code);
    if (!group || LEVEL_OF[group.level] !== 'SUBGROUP') throw new NotFoundException(`Sub group ${code} not found`);

    const ledgers = await this.repo.findLedgersUnder(code);
    const codes = ledgers.map((l) => l.code);
    const [before, within] = await Promise.all([
      this.repo.totalsByAccount(codes, { lt: start }),
      this.repo.totalsByAccount(codes, { gte: start, lte: end }),
    ]);

    let sumOpen = 0;
    let sumDebit = 0;
    let sumCredit = 0;
    const rows = ledgers
      .map((l) => {
        const open =
          openingSigned(l.nature, l.openingBalance.toNumber()) +
          (before.debit.get(l.code) ?? 0) -
          (before.credit.get(l.code) ?? 0);
        const debit = within.debit.get(l.code) ?? 0;
        const credit = within.credit.get(l.code) ?? 0;
        return { code: l.code, name: l.name, open, debit, credit, close: open + debit - credit };
      })
      .filter((r) => r.open !== 0 || r.debit !== 0 || r.credit !== 0)
      .map((r) => {
        sumOpen += r.open;
        sumDebit += r.debit;
        sumCredit += r.credit;
        return { code: r.code, name: r.name, opening: balance(r.open), debit: round2(r.debit), credit: round2(r.credit), closing: balance(r.close) };
      });

    return {
      subGroup: { code: group.code, name: group.name, nature: NATURE_OF[group.nature] },
      from,
      to,
      rows,
      totals: {
        opening: balance(sumOpen),
        debit: round2(sumDebit),
        credit: round2(sumCredit),
        closing: balance(sumOpen + sumDebit - sumCredit),
      },
    };
  }

  // FoxPro jbook + jvbook: each journal with its debit heads, credit heads and "Being the amount …"
  async journalBook(from: string, to: string) {
    const { start, end } = this.range(from, to);
    const rows = await this.repo.findJournals(start, end);
    const names = await this.repo.findAccountsByCodes([...new Set(rows.flatMap((r) => [r.debitCode, r.creditCode]))]);
    const nameOf = new Map(names.map((a) => [a.code, a.name]));

    const journals = new Map<string, { date: string; voucherNo: string; debits: Map<string, number>; credits: Map<string, number>; remark: string }>();
    for (const r of rows) {
      const key = `${isoDate(r.date)}|${r.voucherNo}`;
      if (!journals.has(key)) {
        journals.set(key, { date: isoDate(r.date), voucherNo: r.voucherNo, debits: new Map(), credits: new Map(), remark: '' });
      }
      const j = journals.get(key)!;
      const amount = r.amount.toNumber();
      j.debits.set(r.debitCode, (j.debits.get(r.debitCode) ?? 0) + amount);
      j.credits.set(r.creditCode, (j.credits.get(r.creditCode) ?? 0) + amount);
      if (!j.remark) j.remark = r.creditRemark || r.debitRemark;
    }

    const side = (m: Map<string, number>) =>
      [...m].map(([code, amount]) => ({ code, name: nameOf.get(code) ?? code, amount: round2(amount) }));

    const list = [...journals.values()].map((j) => {
      const debits = side(j.debits);
      return {
        date: j.date,
        voucherNo: j.voucherNo,
        debits,
        credits: side(j.credits),
        remark: j.remark,
        total: round2(debits.reduce((s, d) => s + d.amount, 0)),
      };
    });

    return { from, to, journals: list, total: round2(list.reduce((s, j) => s + j.total, 0)) };
  }

  // ── Shared pieces for the trial balance and final accounts ─────────────

  private async chart() {
    const accounts = await this.repo.findAllAccounts();
    const byCode = new Map(accounts.map((a) => [a.code, a]));
    const ledgers = accounts.filter((a) => LEVEL_OF[a.level] === 'LEDGER');
    // Each ledger's sub group and group, for headings
    const place = (l: AccountRow) => {
      const sub = byCode.get(l.parentCode);
      const group = sub ? byCode.get(sub.parentCode) : undefined;
      return {
        subGroupCode: sub?.code ?? '',
        subGroupName: sub?.name ?? 'No sub group',
        groupCode: group?.code ?? '',
        groupName: group?.name ?? 'No group',
      };
    };
    return { ledgers, place };
  }

  // "Signed debit" of a ledger: positive = Dr, negative = Cr
  private signed(l: AccountRow, totals: Totals, withOpening: boolean) {
    const open = withOpening ? openingSigned(l.nature, l.openingBalance.toNumber()) : 0;
    return open + (totals.debit.get(l.code) ?? 0) - (totals.credit.get(l.code) ?? 0);
  }

  // FoxPro opbaltrl / trial: Opening · Period debit & credit · Closing, under sub-group headings
  async trialBalance(from: string, to: string) {
    const { start, end } = this.range(from, to);
    const { ledgers, place } = await this.chart();
    const [before, within] = await Promise.all([
      this.repo.totalsAll({ lt: start }),
      this.repo.totalsAll({ gte: start, lte: end }),
    ]);

    const sums = { openDr: 0, openCr: 0, debit: 0, credit: 0, closeDr: 0, closeCr: 0 };
    const rows = ledgers
      .map((l) => {
        const open = this.signed(l, before, true);
        const debit = within.debit.get(l.code) ?? 0;
        const credit = within.credit.get(l.code) ?? 0;
        return { l, open, debit, credit, close: open + debit - credit };
      })
      .filter((r) => r.open !== 0 || r.debit !== 0 || r.credit !== 0)
      .map(({ l, open, debit, credit, close }) => {
        if (open > 0) sums.openDr += open;
        else sums.openCr -= open;
        if (close > 0) sums.closeDr += close;
        else sums.closeCr -= close;
        sums.debit += debit;
        sums.credit += credit;
        return {
          ...place(l),
          code: l.code,
          name: l.name,
          nature: NATURE_OF[l.nature],
          opening: balance(open),
          debit: round2(debit),
          credit: round2(credit),
          closing: balance(close),
        };
      })
      .sort((a, b) => a.groupName.localeCompare(b.groupName) || a.subGroupName.localeCompare(b.subGroupName) || a.name.localeCompare(b.name));

    const totals = Object.fromEntries(Object.entries(sums).map(([k, v]) => [k, round2(v)])) as typeof sums;
    return { from, to, rows, totals, difference: round2(totals.closeDr - totals.closeCr) };
  }

  // FoxPro traacc + placc: Trading (with Manufacturing) → Gross profit; P&L → Net profit; Appropriation
  async profitLoss(from: string, to: string) {
    const { start, end } = this.range(from, to);
    const { ledgers, place } = await this.chart();
    const within = await this.repo.totalsAll({ gte: start, lte: end });

    // Income (3) and Expense (4) heads; tmpa 0 is treated as Profit & Loss
    const lines = ledgers
      .filter((l) => l.nature === 3 || l.nature === 4)
      .map((l) => {
        const net = -this.signed(l, within, false); // positive = income (credit)
        return {
          section: STATEMENT_SECTION[l.statement] ?? 'PROFIT_LOSS',
          subGroupName: place(l).subGroupName,
          code: l.code,
          name: l.name,
          debit: net < 0 ? round2(-net) : 0,
          credit: net > 0 ? round2(net) : 0,
          net,
        };
      })
      .filter((x) => x.net !== 0)
      .sort((a, b) => a.subGroupName.localeCompare(b.subGroupName) || a.name.localeCompare(b.name));

    const pick = (...sections: string[]) => lines.filter((x) => sections.includes(x.section));
    const sum = (xs: typeof lines) => xs.reduce((t, x) => t + x.net, 0);
    const clean = (xs: typeof lines) => xs.map(({ net: _net, ...rest }) => rest);

    const trading = pick('TRADING', 'MANUFACTURING');
    const pl = pick('PROFIT_LOSS');
    const appropriation = pick('APPROPRIATION');
    const grossProfit = sum(trading);
    const netProfit = grossProfit + sum(pl);
    const retained = netProfit + sum(appropriation);

    return {
      from,
      to,
      trading: { lines: clean(trading), grossProfit: round2(grossProfit) },
      profitLoss: { lines: clean(pl), netProfit: round2(netProfit) },
      appropriation: { lines: clean(appropriation), retained: round2(retained) },
    };
  }

  // FoxPro balsh / sgrblash: Assets and Liabilities as on a date, profit to date added to liabilities
  async balanceSheet(date: string) {
    const asOn = parseDate(date, 'Date');
    const { ledgers, place } = await this.chart();
    const upTo = await this.repo.totalsAll({ lte: asOn });

    // Profit to date = every income and expense head, including opening balances
    const profit = -ledgers
      .filter((l) => l.nature === 3 || l.nature === 4)
      .reduce((t, l) => t + this.signed(l, upTo, true), 0);

    const side = (nature: number, sign: 1 | -1) => {
      const items = ledgers
        .filter((l) => l.nature === nature)
        .map((l) => ({ ...place(l), code: l.code, name: l.name, amount: sign * this.signed(l, upTo, true) }))
        .filter((x) => round2(x.amount) !== 0);

      // Group → Sub group → Ledgers
      const groups = new Map<string, { name: string; subGroups: Map<string, { name: string; lines: { code: string; name: string; amount: number }[] }> }>();
      for (const x of items) {
        if (!groups.has(x.groupCode)) groups.set(x.groupCode, { name: x.groupName, subGroups: new Map() });
        const g = groups.get(x.groupCode)!;
        if (!g.subGroups.has(x.subGroupCode)) g.subGroups.set(x.subGroupCode, { name: x.subGroupName, lines: [] });
        g.subGroups.get(x.subGroupCode)!.lines.push({ code: x.code, name: x.name, amount: round2(x.amount) });
      }
      const list = [...groups.values()]
        .map((g) => {
          const subGroups = [...g.subGroups.values()]
            .map((s) => ({ name: s.name, lines: s.lines.sort((a, b) => a.name.localeCompare(b.name)), total: round2(s.lines.reduce((t, x) => t + x.amount, 0)) }))
            .sort((a, b) => a.name.localeCompare(b.name));
          return { name: g.name, subGroups, total: round2(subGroups.reduce((t, s) => t + s.total, 0)) };
        })
        .sort((a, b) => a.name.localeCompare(b.name));
      return { groups: list, total: round2(list.reduce((t, g) => t + g.total, 0)) };
    };

    const assets = side(1, 1); // debit balances
    const liabilities = side(2, -1); // credit balances
    const liabilitiesWithProfit = round2(liabilities.total + profit);

    return {
      date,
      assets,
      liabilities,
      profit: round2(profit),
      totals: { assets: assets.total, liabilities: liabilitiesWithProfit },
      difference: round2(assets.total - liabilitiesWithProfit),
    };
  }
}
