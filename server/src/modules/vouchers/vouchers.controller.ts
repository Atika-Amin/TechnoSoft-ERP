import { Body, Controller, Get, Param, Post, Put, Query } from '@nestjs/common';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import type { JwtPayload } from '../auth/jwt-payload.js';
import { SaveJournalDto } from './dto/save-journal.dto.js';
import { SaveVoucherDto } from './dto/save-voucher.dto.js';
import { fiscalYear, VouchersService } from './vouchers.service.js';

// Presentation layer for vouchers. The working year comes from the login token.
@Controller('vouchers')
export class VouchersController {
  constructor(private readonly vouchers: VouchersService) {}

  // GET /api/vouchers/setup → ledgers + project jobs for the dropdowns
  @Get('setup')
  setup() {
    return this.vouchers.setup();
  }

  // GET /api/vouchers/next-number?type=BP&bank=100034
  @Get('next-number')
  nextNumber(@Query('type') type: string, @Query('bank') bank: string | undefined, @CurrentUser() user: JwtPayload) {
    return this.vouchers.nextNumber(type, bank, fiscalYear(user.workingYear));
  }

  // ── Journal (JR) ── identified by number + date

  // GET /api/vouchers/journal/next-number?date=2026-11-19
  @Get('journal/next-number')
  nextJournalNo(@Query('date') date: string, @CurrentUser() user: JwtPayload) {
    return this.vouchers.nextJournalNo(date, fiscalYear(user.workingYear));
  }

  // GET /api/vouchers/journal/JR00002?date=2026-11-19
  @Get('journal/:voucherNo')
  findJournal(@Param('voucherNo') voucherNo: string, @Query('date') date: string, @CurrentUser() user: JwtPayload) {
    return this.vouchers.findJournal(voucherNo, date, fiscalYear(user.workingYear));
  }

  // POST /api/vouchers/journal
  @Post('journal')
  createJournal(@Body() dto: SaveJournalDto, @CurrentUser() user: JwtPayload) {
    return this.vouchers.createJournal(dto, fiscalYear(user.workingYear));
  }

  // PUT /api/vouchers/journal/JR00002
  @Put('journal/:voucherNo')
  updateJournal(@Param('voucherNo') voucherNo: string, @Body() dto: SaveJournalDto, @CurrentUser() user: JwtPayload) {
    return this.vouchers.updateJournal(voucherNo, dto, fiscalYear(user.workingYear));
  }

  // ── Cash / cheque vouchers ──

  // GET /api/vouchers/CP00012   (cheque vouchers also need ?bank=100034)
  @Get(':voucherNo')
  find(@Param('voucherNo') voucherNo: string, @Query('bank') bank: string | undefined, @CurrentUser() user: JwtPayload) {
    return this.vouchers.find(voucherNo, bank, fiscalYear(user.workingYear));
  }

  // POST /api/vouchers
  @Post()
  create(@Body() dto: SaveVoucherDto, @CurrentUser() user: JwtPayload) {
    return this.vouchers.create(dto, fiscalYear(user.workingYear));
  }

  // PUT /api/vouchers/CP00012
  @Put(':voucherNo')
  update(@Param('voucherNo') voucherNo: string, @Body() dto: SaveVoucherDto, @CurrentUser() user: JwtPayload) {
    return this.vouchers.update(voucherNo, dto, fiscalYear(user.workingYear));
  }
}
