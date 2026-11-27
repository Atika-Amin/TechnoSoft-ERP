import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsDateString,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';

// One row of the journal grid: an account with EITHER a debit OR a credit amount
export class JournalLineDto {
  @IsString()
  @IsNotEmpty({ message: 'Every line needs an account' })
  accountCode: string;

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  debit: number;

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  credit: number;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  remarks?: string;

  @IsOptional()
  @IsString()
  jobCode?: string | null;
}

export class SaveJournalDto {
  // Optional: type your own number. Leave it out and the server picks the next one for that date.
  @IsOptional()
  @Matches(/^\d+$/, { message: 'Voucher number must contain digits only' })
  number?: string;

  @IsDateString({}, { message: 'Date must be a valid date' })
  date: string; // YYYY-MM-DD; together with the number it identifies the journal

  @IsArray()
  @ArrayMinSize(2, { message: 'A journal needs at least one debit line and one credit line' })
  @ValidateNested({ each: true })
  @Type(() => JournalLineDto)
  lines: JournalLineDto[];
}
