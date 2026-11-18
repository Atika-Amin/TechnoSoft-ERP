import { api } from '../../../lib/axios';
import type { LedgerType } from '../../accounts/api/chart.api';

export type VoucherType = 'CP' | 'CR' | 'BP' | 'BR';

export interface LedgerOption {
  code: string;
  name: string;
  ledgerType: LedgerType;
  groupName: string; // its sub group
}

export interface JobOption {
  code: string;
  name: string;
  accountCode: string;
  isDefault: boolean;
}

export interface VoucherSetup {
  ledgers: LedgerOption[];
  jobs: JobOption[];
}

export interface VoucherLine {
  accountCode: string;
  accountName: string;
  amount: number;
  remarks: string;
  jobCode: string | null;
}

export interface Voucher {
  type: VoucherType;
  voucherNo: string;
  date: string; // YYYY-MM-DD
  accountCode: string; // cash or bank ledger
  lines: VoucherLine[];
}

export interface SaveVoucherInput {
  type: VoucherType;
  number?: string;
  date: string;
  accountCode: string;
  lines: { accountCode: string; amount: number; remarks: string; jobCode: string | null }[];
}

export interface SaveVoucherResult {
  voucherNo: string;
  total: number;
  message: string;
}

export const getVoucherSetup = () => api.get<VoucherSetup>('/vouchers/setup').then((r) => r.data);

export const getNextVoucherNo = (type: VoucherType, bank?: string) =>
  api.get<{ voucherNo: string }>('/vouchers/next-number', { params: { type, bank } }).then((r) => r.data.voucherNo);

export const getVoucher = (voucherNo: string, bank?: string) =>
  api.get<Voucher>(`/vouchers/${voucherNo}`, { params: { bank } }).then((r) => r.data);

export const createVoucher = (input: SaveVoucherInput) =>
  api.post<SaveVoucherResult>('/vouchers', input).then((r) => r.data);

export const updateVoucher = (voucherNo: string, input: SaveVoucherInput) =>
  api.put<SaveVoucherResult>(`/vouchers/${voucherNo}`, input).then((r) => r.data);
