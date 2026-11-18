import { api } from '../../../lib/axios';

export type Level = 'GROUP' | 'SUBGROUP' | 'LEDGER';
export type Nature = 'ASSETS' | 'LIABILITY' | 'INCOME' | 'EXPENSE';
export type Statement = 'TRADING' | 'MANUFACTURING' | 'PROFIT_LOSS' | 'APPROPRIATION';
export type LedgerType = 'CASH' | 'BANK' | 'STORE' | 'PARTY' | 'NONE' | 'PROJECT';

// One row of the FoxPro "lcodes" table, as the API sends it (words instead of FoxPro numbers)
export interface Account {
  code: string; // ledcode
  name: string; // ledname
  level: Level; // ledlabel
  parentCode: string | null; // undergrp
  nature: Nature; // lednat
  statement: Statement | null; // tmpa (null = none)
  ledgerType: LedgerType; // codesign
  openingBalance: number; // op_bal
  remarks1: string; // rem1
  remarks2: string; // rem2
  projectCode?: string | null; // jprofile.jcode, if this ledger has a project
}

// What we send when saving. code is optional: leave it out and the server picks the next one.
export type AccountInput = Omit<Account, 'code' | 'projectCode'> & { code?: string };

// What the server sends back after a save
export type SavedAccount = Account & { createdProjectCode: string | null };

export const getAccounts = () => api.get<Account[]>('/accounts/chart').then((r) => r.data);

export const createAccount = (account: AccountInput) =>
  api.post<SavedAccount>('/accounts/chart', account).then((r) => r.data);

export const updateAccount = (code: string, account: AccountInput) =>
  api.put<SavedAccount>(`/accounts/chart/${code}`, account).then((r) => r.data);
