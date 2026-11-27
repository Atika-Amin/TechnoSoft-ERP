import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class SaveCompanyDto {
  @IsString()
  @IsNotEmpty({ message: 'Company name is required' })
  @MaxLength(255)
  name: string;

  @IsOptional() @IsString() @MaxLength(255) address1?: string;
  @IsOptional() @IsString() @MaxLength(255) address2?: string;
  @IsOptional() @IsString() @MaxLength(255) address3?: string;
  @IsOptional() @IsString() @MaxLength(255) nature?: string;
  @IsOptional() @IsString() @MaxLength(100) phone?: string;
}
