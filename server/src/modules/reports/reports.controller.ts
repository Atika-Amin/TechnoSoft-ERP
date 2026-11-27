import { Controller, Get, Query } from '@nestjs/common';
import { ReportsService } from './reports.service.js';

// Presentation layer for reports (all read-only, GET)
@Controller('reports')
export class ReportsController {
  constructor(private readonly reports: ReportsService) {}

  // GET /api/reports/options → ledgers and sub groups for the pickers
  @Get('options')
  options() {
    return this.reports.options();
  }

  // GET /api/reports/ledger?account=100031&from=2026-07-01&to=2026-11-30  (also Cash book / Bank book)
  @Get('ledger')
  ledger(@Query('account') account: string, @Query('from') from: string, @Query('to') to: string) {
    return this.reports.ledger(account, from, to);
  }

  // GET /api/reports/sub-group?code=100026&from=…&to=…
  @Get('sub-group')
  subGroup(@Query('code') code: string, @Query('from') from: string, @Query('to') to: string) {
    return this.reports.subGroup(code, from, to);
  }

  // GET /api/reports/trial-balance?from=…&to=…
  @Get('trial-balance')
  trialBalance(@Query('from') from: string, @Query('to') to: string) {
    return this.reports.trialBalance(from, to);
  }

  // GET /api/reports/profit-loss?from=…&to=…  (Trading, Profit & Loss, Appropriation)
  @Get('profit-loss')
  profitLoss(@Query('from') from: string, @Query('to') to: string) {
    return this.reports.profitLoss(from, to);
  }

  // GET /api/reports/balance-sheet?date=…
  @Get('balance-sheet')
  balanceSheet(@Query('date') date: string) {
    return this.reports.balanceSheet(date);
  }

  // GET /api/reports/journal-book?from=…&to=…
  @Get('journal-book')
  journalBook(@Query('from') from: string, @Query('to') to: string) {
    return this.reports.journalBook(from, to);
  }
}
