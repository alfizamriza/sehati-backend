import {
  IsBoolean,
  IsDateString,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { Transform } from 'class-transformer';

export class UpdateTanggalLiburDto {
  @IsDateString()
  @IsOptional()
  tanggal?: string;

  @IsString()
  @IsOptional()
  @MaxLength(255)
  @Transform(({ value }) => value?.trim())
  keterangan?: string;

  @IsBoolean()
  @IsOptional()
  is_active?: boolean;
}