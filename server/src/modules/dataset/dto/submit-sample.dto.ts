import { Type } from 'class-transformer';
import { IsIn, IsInt, IsString, IsUUID, Max, MaxLength, Min } from 'class-validator';

// Form fields sent together with the audio file (multipart/form-data, so numbers arrive as text)
export class SubmitSampleDto {
  @IsUUID()
  speakerId!: string;

  @IsIn(['female', 'male', 'other'])
  gender!: string;

  @IsIn(['under25', '25-40', '40-60', '60plus'])
  ageGroup!: string;

  @IsString()
  @MaxLength(50)
  region!: string;

  @IsIn(['quiet', 'noisy', 'outdoor'])
  environment!: string;

  @IsIn(['phone', 'laptop', 'desktop'])
  device!: string;

  @IsIn(['read', 'scenario'])
  mode!: 'read' | 'scenario';

  @Type(() => Number)
  @IsInt()
  @Min(0)
  seed!: number;

  @Type(() => Number)
  @IsInt()
  @Min(500)
  @Max(60000)
  durationMs!: number;

  // The speaker must tick the consent box
  @IsIn(['true'])
  consent!: string;
}
