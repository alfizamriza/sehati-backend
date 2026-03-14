import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { KategoriPelanggaran } from '../../../common/enums/kategori-pelanggaran.enum';

export class UpdateJenisPelanggaranDto {
  @IsString()
  @IsOptional()
  @MaxLength(150)
  @Transform(({ value }) => value?.trim())
  nama?: string;

  @IsEnum(KategoriPelanggaran)
  @IsOptional()
  kategori?: KategoriPelanggaran;

  @IsInt()
  @Min(0)
  @IsOptional()
  bobot_coins?: number;

  @IsString()
  @IsOptional()
  @MaxLength(500)
  @Transform(({ value }) => value?.trim())
  deskripsi?: string;

  @IsBoolean()
  @IsOptional()
  is_active?: boolean;
}