import { IsNotEmpty, IsString, Matches } from 'class-validator';

export class LoginDto {
  @IsString()
  @IsNotEmpty({ message: 'Username is required' })
  username: string;

  @IsString()
  @IsNotEmpty({ message: 'Password is required' })
  password: string;

  @Matches(/^\d{4}-\d{4}$/, { message: 'Invalid working year' })
  workingYear: string;
}
