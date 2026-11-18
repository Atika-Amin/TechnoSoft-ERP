import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsDateString,
  IsIn,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  Matches,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { VOUCHER_TYPES, type VoucherType } from '../vouchers.constants.js';

// One row of the grid (FoxPro cursor code1)
export class VoucherLineDto {
  @IsString()
  @IsNotEmpty({ message: 'Every line needs an account' })
  accountCode: string; // hcode

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive({ message: 'Amounts must be more than 0' })
  amount: number; // taka

  @IsOptional()
  @IsString()
  @MaxLength(500)
  remarks?: string;

  @IsOptional()
  @IsString()
  jobCode?: string | null; // prjcode
}

export class SaveVoucherDto {
  @IsIn(VOUCHER_TYPES)
  type: VoucherType;

  // Optional: type your own number. Leave it out and the server picks the next one.
  @IsOptional()
  @Matches(/^\d+$/, { message: 'Voucher number must contain digits only' })
  number?: string;

  @IsDateString({}, { message: 'Date must be a valid date' })
  date: string; // YYYY-MM-DD

  // The cash account (CP / CR) or the bank account (BP / BR)
  @IsString()
  @IsNotEmpty({ message: 'Choose the cash or bank account' })
  accountCode: string;

  @IsArray()
  @ArrayMinSize(1, { message: 'Add at least one line with an amount' })
  @ValidateNested({ each: true })
  @Type(() => VoucherLineDto)
  lines: VoucherLineDto[];
}
