import { Injectable } from '@nestjs/common';
import type { Account, Prisma } from '../../generated/prisma/client.js';
import { PrismaService } from '../../prisma/prisma.service.js';

const FIRST_CODE = 100001;

// Persistence layer: every query on lcodes and jprofile lives here
@Injectable()
export class AccountsRepository {
  constructor(private readonly prisma: PrismaService) {}

  findAll() {
    return this.prisma.account.findMany({ orderBy: { code: 'asc' } });
  }

  findAllProjects() {
    return this.prisma.project.findMany({ select: { code: true, accountCode: true } });
  }

  findByCode(code: string) {
    return this.prisma.account.findUnique({ where: { code } });
  }

  // SQL Server's default collation is case-insensitive, so "Sales" = "sales" here
  findByNameAndLevel(name: string, level: number) {
    return this.prisma.account.findFirst({ where: { name, level } });
  }

  async nextCode() {
    const last = await this.prisma.account.findFirst({ orderBy: { code: 'desc' }, select: { code: true } });
    return String(last ? Number(last.code) + 1 : FIRST_CODE).padStart(6, '0');
  }

  // $transaction: either everything inside is saved, or nothing is (no half-saved data)
  create(data: Prisma.AccountUncheckedCreateInput, withProject: boolean) {
    return this.prisma.$transaction(async (tx) => {
      const account = await tx.account.create({ data });
      const project = withProject ? await this.createProjectIfMissing(tx, account) : null;
      return { account, project };
    });
  }

  update(
    code: string,
    data: Prisma.AccountUncheckedUpdateInput,
    withProject: boolean,
    pushToLedgers: Prisma.AccountUncheckedUpdateManyInput | null,
  ) {
    return this.prisma.$transaction(async (tx) => {
      const account = await tx.account.update({ where: { code }, data });
      if (pushToLedgers) {
        await tx.account.updateMany({ where: { parentCode: code, level: 3 }, data: pushToLedgers });
      }
      const project = withProject ? await this.createProjectIfMissing(tx, account) : null;
      return { account, project };
    });
  }

  // FoxPro: locate for acccode == thiscode / if !found() → insert into jprofile with the next jcode
  private async createProjectIfMissing(tx: Prisma.TransactionClient, account: Account) {
    const existing = await tx.project.findUnique({ where: { accountCode: account.code } });
    if (existing) return null;

    const last = await tx.project.findFirst({ orderBy: { code: 'desc' }, select: { code: true } });
    const code = String(last ? Number(last.code) + 1 : 1).padStart(5, '0'); // padl(..., 5, [0])
    return tx.project.create({ data: { code, name: account.name, accountCode: account.code } });
  }
}
