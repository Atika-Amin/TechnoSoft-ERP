import { Injectable } from '@nestjs/common';
import type { Prisma } from '../../generated/prisma/client.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import { LEDGER_LEVEL } from './vouchers.constants.js';

// Filters one voucher: its number, the working year, and for cheque vouchers the bank side
export interface VoucherFilter {
  voucherNo: string;
  from: Date;
  to: Date;
  bank?: { debitCode?: string; creditCode?: string };
}

// Persistence layer: every query on trction (and the lookups vouchers need)
@Injectable()
export class VouchersRepository {
  constructor(private readonly prisma: PrismaService) {}

  findLedgers() {
    return this.prisma.account.findMany({
      where: { level: LEDGER_LEVEL },
      select: { code: true, name: true, ledgerType: true, parentCode: true },
      orderBy: { name: 'asc' },
    });
  }

  findAccountsByCodes(codes: string[]) {
    return this.prisma.account.findMany({ where: { code: { in: codes } } });
  }

  findProjects() {
    return this.prisma.project.findMany({
      select: { code: true, name: true, accountCode: true, isDefault: true },
      orderBy: { code: 'asc' },
    });
  }

  findRows({ voucherNo, from, to, bank }: VoucherFilter) {
    return this.prisma.voucherEntry.findMany({
      where: { voucherNo, date: { gte: from, lte: to }, ...bank },
      orderBy: { id: 'asc' },
    });
  }

  // Highest voucher number of a type in the working year (FoxPro autovnos / autobvno)
  async lastVoucherNo(prefix: string, from: Date, to: Date, bank?: VoucherFilter['bank']) {
    const last = await this.prisma.voucherEntry.findFirst({
      where: { voucherNo: { startsWith: prefix }, date: { gte: from, lte: to }, ...bank },
      orderBy: { voucherNo: 'desc' },
      select: { voucherNo: true },
    });
    return last?.voucherNo ?? null;
  }

  // FoxPro: dele all for voucher == actvoucher … then insert each row.
  // Done in one transaction, so a voucher is never left half-saved.
  replace(filter: VoucherFilter | null, rows: Prisma.VoucherEntryCreateManyInput[]) {
    return this.prisma.$transaction(async (tx) => {
      if (filter) {
        await tx.voucherEntry.deleteMany({
          where: { voucherNo: filter.voucherNo, date: { gte: filter.from, lte: filter.to }, ...filter.bank },
        });
      }
      await tx.voucherEntry.createMany({ data: rows });
    });
  }
}
