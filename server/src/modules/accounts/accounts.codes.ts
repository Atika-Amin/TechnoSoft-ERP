// FoxPro stores choices as numbers. The API and the screens use words.
// These maps translate between the two, in one place.
import type { LedgerType, Level, Nature, Statement } from './dto/save-account.dto.js';

export const LEVEL_NO: Record<Level, number> = { GROUP: 1, SUBGROUP: 2, LEDGER: 3 }; // ledlabel
export const NATURE_NO: Record<Nature, number> = { ASSETS: 1, LIABILITY: 2, INCOME: 3, EXPENSE: 4 }; // lednat
export const STATEMENT_NO: Record<Statement, number> = { TRADING: 1, MANUFACTURING: 2, PROFIT_LOSS: 3, APPROPRIATION: 4 }; // tmpa
export const TYPE_NO: Record<LedgerType, number> = { CASH: 1, BANK: 2, STORE: 3, PARTY: 4, NONE: 5, PROJECT: 6 }; // codesign

// Reverse lookup: 3 → 'LEDGER'
const reverse = <K extends string>(map: Record<K, number>) =>
  Object.fromEntries(Object.entries(map).map(([k, v]) => [v, k])) as Record<number, K>;

export const LEVEL_OF = reverse(LEVEL_NO);
export const NATURE_OF = reverse(NATURE_NO);
export const STATEMENT_OF = reverse(STATEMENT_NO);
export const TYPE_OF = reverse(TYPE_NO);
