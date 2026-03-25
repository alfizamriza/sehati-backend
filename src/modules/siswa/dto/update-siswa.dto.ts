import { IsOptional, IsString, IsInt, IsBoolean, MinLength, Length, IsArray } from 'class-validator';

export class UpdateSiswaDto {
  @IsOptional()
  @IsString()
  nama?: string;

  @IsOptional()
  @IsInt()
  kelasId?: number;

  @IsOptional()
  @IsString()
  @MinLength(6, { message: 'Password minimal 6 karakter' })
  password?: string;

  @IsOptional()
  @IsBoolean()
  statusAktif?: boolean;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  permissions?: string[];
}