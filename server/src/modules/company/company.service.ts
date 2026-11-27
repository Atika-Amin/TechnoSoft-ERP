import { Injectable } from '@nestjs/common';
import { CompanyRepository } from './company.repository.js';
import type { SaveCompanyDto } from './dto/save-company.dto.js';

// Business layer: company details shown in the app and printed on reports
@Injectable()
export class CompanyService {
  constructor(private readonly repo: CompanyRepository) {}

  async get() {
    const p = await this.repo.find();
    return {
      name: p?.name || 'Your Company Name',
      address1: p?.address1 ?? '',
      address2: p?.address2 ?? '',
      address3: p?.address3 ?? '',
      nature: p?.nature ?? '',
      phone: p?.phone ?? '',
    };
  }

  async save(dto: SaveCompanyDto) {
    await this.repo.save({
      name: dto.name.trim(),
      address1: dto.address1?.trim() ?? '',
      address2: dto.address2?.trim() ?? '',
      address3: dto.address3?.trim() ?? '',
      nature: dto.nature?.trim() ?? '',
      phone: dto.phone?.trim() ?? '',
    });
    return this.get();
  }
}
