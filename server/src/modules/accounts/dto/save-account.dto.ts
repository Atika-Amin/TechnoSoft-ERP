import { Type } from 'class-transformer';
import { IsIn, IsNotEmpty, IsNumber, IsOptional, IsString, Matches, MaxLength } from 'class-validator';

export const LEVELS = ['GROUP', 'SUBGROUP', 'LEDGER'] as const;
export const NATURES = ['ASSETS', 'LIABILITY', 'INCOME', 'EXPENSE'] as const;
export const STATEMENTS = ['TRADING', 'MANUFACTURING', 'PROFIT_LOSS', 'APPROPRIATION'] as const;
export const LEDGER_TYPES = ['CASH', 'BANK', 'STORE', 'PARTY', 'NONE', 'PROJECT'] as const;

export type Level = (typeof LEVELS)[number];
export type Nature = (typeof NATURES)[number];
export type Statement = (typeof STATEMENTS)[number];
export type LedgerType = (typeof LEDGER_TYPES)[number];

// Shape of the JSON body for creating / updating an account.
export class SaveAccountDto {
  // Optional: type your own code (like FoxPro's Code box). Leave it out and the server picks the next one.
  @IsOptional()
  @Matches(/^\d{1,20}$/, { message: 'Code must contain digits only' })
  code?: string;

  @IsString()
  @IsNotEmpty({ message: 'Name is required' })
  @MaxLength(255) // matches the database column
  name: string;

  @IsIn(LEVELS)
  level: Level;

  @IsOptional()
  @IsString()
  parentCode: string | null;

  @IsIn(NATURES)
  nature: Nature;

  // One choice only, like FoxPro's tmpa (1-4). null = not in any of them.
  @IsOptional()
  @IsIn(STATEMENTS)
  statement: Statement | null;

  @IsIn(LEDGER_TYPES)
  ledgerType: LedgerType;

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  openingBalance: number;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  remarks1?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  remarks2?: string;
}
