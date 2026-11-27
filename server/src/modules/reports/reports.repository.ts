import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';

const LEDGER = 3;
const SUB_GROUP = 2;
const JOURNAL = 6;

// Persistence layer for reports: read-only queries on lcodes and trction
@Injectable()
export class ReportsRepository {
  constructor(private readonly prisma: PrismaService) {}

  findOptions() {
    return this.prisma.account.findMany({
      where: { level: { in: [SUB_GROUP, LEDGER] } },
      select: { code: true, name: true, level: true, nature: true, ledgerType: true, parentCode: true },
      orderBy: { name: 'asc' },
    });
  }

  findAccount(code: string) {
    return this.prisma.account.findUnique({ where: { code } });
  }

  findAccountsByCodes(codes: string[]) {
    return this.prisma.account.findMany({ where: { code: { in: codes } }, select: { code: true, name: true } });
  }

  findLedgersUnder(subGroupCode: string) {
    return this.prisma.account.findMany({ where: { parentCode: subGroupCode, level: LEDGER }, orderBy: { name: 'asc' } });
  }

  // Total debits and credits of one account before a date (for the opening balance)
  async totalsBefore(code: string, before: Date) {
    const [dr, cr] = await Promise.all([
      this.prisma.voucherEntry.aggregate({ _sum: { amount: true }, where: { debitCode: code, date: { lt: before } } }),
      this.prisma.voucherEntry.aggregate({ _sum: { amount: true }, where: { creditCode: code, date: { lt: before } } }),
    ]);
    return { debit: dr._sum.amount?.toNumber() ?? 0, credit: cr._sum.amount?.toNumber() ?? 0 };
  }

  // Every trction row of one account in a date range
  findMovements(code: string, from: Date, to: Date) {
    return this.prisma.voucherEntry.findMany({
      where: { date: { gte: from, lte: to }, OR: [{ debitCode: code }, { creditCode: code }] },
    });
  }

  // Debit and credit totals per account (date filter optional)
  async totalsByAccount(codes: string[], date: { lt?: Date; gte?: Date; lte?: Date }) {
    const [dr, cr] = await Promise.all([
      this.prisma.voucherEntry.groupBy({ by: ['debitCode'], _sum: { amount: true }, where: { debitCode: { in: codes }, date } }),
      this.prisma.voucherEntry.groupBy({ by: ['creditCode'], _sum: { amount: true }, where: { creditCode: { in: codes }, date } }),
    ]);
    return {
      debit: new Map(dr.map((r) => [r.debitCode, r._sum.amount?.toNumber() ?? 0])),
      credit: new Map(cr.map((r) => [r.creditCode, r._sum.amount?.toNumber() ?? 0])),
    };
  }

  // Whole chart of accounts (for trial balance and final accounts)
  findAllAccounts() {
    return this.prisma.account.findMany({ orderBy: { code: 'asc' } });
  }

  // Debit and credit totals of every account, for a date filter
  async totalsAll(date: { lt?: Date; gte?: Date; lte?: Date }) {
    const [dr, cr] = await Promise.all([
      this.prisma.voucherEntry.groupBy({ by: ['debitCode'], _sum: { amount: true }, where: { date } }),
      this.prisma.voucherEntry.groupBy({ by: ['creditCode'], _sum: { amount: true }, where: { date } }),
    ]);
    return {
      debit: new Map(dr.map((r) => [r.debitCode, r._sum.amount?.toNumber() ?? 0])),
      credit: new Map(cr.map((r) => [r.creditCode, r._sum.amount?.toNumber() ?? 0])),
    };
  }

  findJournals(from: Date, to: Date) {
    return this.prisma.voucherEntry.findMany({
      where: { type: JOURNAL, date: { gte: from, lte: to } },
      orderBy: [{ date: 'asc' }, { voucherNo: 'asc' }, { id: 'asc' }],
    });
  }
}
