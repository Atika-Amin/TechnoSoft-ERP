import { Body, Controller, Get, Param, Post, Put } from '@nestjs/common';
import { AccountsService } from './accounts.service.js';
import { SaveAccountDto } from './dto/save-account.dto.js';

// Presentation layer for the chart of accounts
@Controller('accounts/chart')
export class AccountsController {
  constructor(private readonly accounts: AccountsService) {}

  // GET /api/accounts/chart
  @Get()
  findAll() {
    return this.accounts.findAll();
  }

  // POST /api/accounts/chart
  @Post()
  create(@Body() dto: SaveAccountDto) {
    return this.accounts.create(dto);
  }

  // PUT /api/accounts/chart/100005
  @Put(':code')
  update(@Param('code') code: string, @Body() dto: SaveAccountDto) {
    return this.accounts.update(code, dto);
  }
}
