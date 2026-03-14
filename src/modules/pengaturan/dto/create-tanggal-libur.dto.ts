import {
  IsBoolean,
  IsDateString,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { Transform } from 'class-transformer';

export class CreateTanggalLiburDto {
  @IsDateString()
  @IsNotEmpty()
  tanggal: string; // format: YYYY-MM-DD

  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  @Transform(({ value }) => value?.trim())
  keterangan: string;

  @IsBoolean()
  @IsOptional()
  is_active?: boolean;
}