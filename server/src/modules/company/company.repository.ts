import { Injectable } from '@nestjs/common';
import type { Prisma } from '../../generated/prisma/client.js';
import { PrismaService } from '../../prisma/prisma.service.js';

// Persistence layer for the one-row profile table
@Injectable()
export class CompanyRepository {
  constructor(private readonly prisma: PrismaService) {}

  find() {
    return this.prisma.companyProfile.findFirst({ orderBy: { id: 'asc' } });
  }

  async save(data: Prisma.CompanyProfileCreateInput) {
    const existing = await this.find();
    return existing
      ? this.prisma.companyProfile.update({ where: { id: existing.id }, data })
      : this.prisma.companyProfile.create({ data });
  }
}
