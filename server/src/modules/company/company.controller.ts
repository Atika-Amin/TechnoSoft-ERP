import { Body, Controller, Get, Put } from '@nestjs/common';
import { CompanyService } from './company.service.js';
import { SaveCompanyDto } from './dto/save-company.dto.js';

// GET / PUT /api/company
@Controller('company')
export class CompanyController {
  constructor(private readonly company: CompanyService) {}

  @Get()
  get() {
    return this.company.get();
  }

  @Put()
  save(@Body() dto: SaveCompanyDto) {
    return this.company.save(dto);
  }
}
