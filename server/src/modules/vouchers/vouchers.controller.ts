import { Body, Controller, Get, Param, Post, Put, Query } from '@nestjs/common';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import type { JwtPayload } from '../auth/jwt-payload.js';
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
