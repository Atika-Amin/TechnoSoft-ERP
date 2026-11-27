import { api } from '../../../lib/axios';
import type { LedgerType, Level, Nature } from '../../accounts/api/chart.api';

export interface ReportOption {
  code: string;
  name: string;
  level: Level;
  nature: Nature;
  ledgerType: LedgerType;
  groupName: string;
}

export interface Balance {
  amount: number;
  side: 'Dr' | 'Cr' | '';
}

export interface LedgerReport {
  account: { code: string; name: string; nature: Nature; ledgerType: LedgerType };
  from: string;
  to: string;
  opening: Balance;
  lines: {
    date: string;
    voucherNo: string;
    type: number;
    otherCode: string;
    otherName: string;
    remarks: string;
    debit: number;
    credit: number;
    balance: Balance;
  }[];
  totals: { debit: number; credit: number };
  closing: Balance;
}

export interface SubGroupReport {
  subGroup: { code: string; name: string };
  from: string;
  to: string;
  rows: { code: string; name: string; opening: Balance; debit: number; credit: number; closing: Balance }[];
  totals: { opening: Balance; debit: number; credit: number; closing: Balance };
}

export interface JournalBookReport {
  from: string;
  to: string;
  journals: {
    date: string;
    voucherNo: string;
    debits: { code: string; name: string; amount: number }[];
    credits: { code: string; name: string; amount: number }[];
    remark: string;
    total: number;
  }[];
  total: number;
}

export const getReportOptions = () => api.get<ReportOption[]>('/reports/options').then((r) => r.data);

export const getLedgerReport = (account: string, from: string, to: string) =>
  api.get<LedgerReport>('/reports/ledger', { params: { account, from, to } }).then((r) => r.data);

export const getSubGroupReport = (code: string, from: string, to: string) =>
  api.get<SubGroupReport>('/reports/sub-group', { params: { code, from, to } }).then((r) => r.data);

export const getJournalBook = (from: string, to: string) =>
  api.get<JournalBookReport>('/reports/journal-book', { params: { from, to } }).then((r) => r.data);

export interface TrialBalanceReport {
  from: string;
  to: string;
  rows: {
    groupName: string;
    subGroupName: string;
    code: string;
    name: string;
    opening: Balance;
    debit: number;
    credit: number;
    closing: Balance;
  }[];
  totals: { openDr: number; openCr: number; debit: number; credit: number; closeDr: number; closeCr: number };
  difference: number;
}

export interface PLLine {
  section: 'TRADING' | 'MANUFACTURING' | 'PROFIT_LOSS' | 'APPROPRIATION';
  subGroupName: string;
  code: string;
  name: string;
  debit: number;
  credit: number;
}

export interface ProfitLossReport {
  from: string;
  to: string;
  trading: { lines: PLLine[]; grossProfit: number };
  profitLoss: { lines: PLLine[]; netProfit: number };
  appropriation: { lines: PLLine[]; retained: number };
}

export interface BalanceSide {
  groups: { name: string; total: number; subGroups: { name: string; total: number; lines: { code: string; name: string; amount: number }[] }[] }[];
  total: number;
}

export interface BalanceSheetReport {
  date: string;
  assets: BalanceSide;
  liabilities: BalanceSide;
  profit: number;
  totals: { assets: number; liabilities: number };
  difference: number;
}

export const getTrialBalance = (from: string, to: string) =>
  api.get<TrialBalanceReport>('/reports/trial-balance', { params: { from, to } }).then((r) => r.data);

export const getProfitLoss = (from: string, to: string) =>
  api.get<ProfitLossReport>('/reports/profit-loss', { params: { from, to } }).then((r) => r.data);

export const getBalanceSheet = (date: string) =>
  api.get<BalanceSheetReport>('/reports/balance-sheet', { params: { date } }).then((r) => r.data);
