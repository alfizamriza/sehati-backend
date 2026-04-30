import {
  IsOptional, IsString, IsBoolean, MinLength, Matches,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class UpdateKantinDto {
  @ApiPropertyOptional({
    example: 'Kantin Sehat Baru',
    description: 'Nama kantin.',
  })
  @IsOptional()
  @IsString()
  nama?: string;

  @ApiPropertyOptional({
    example: 'kantin_baru',
    description: 'Username akun kantin.',
  })
  @IsOptional()
  @IsString()
  @Matches(/^[a-zA-Z0-9_]+$/, {
    message: 'Username hanya boleh huruf, angka, dan underscore',
  })
  username?: string;

  @ApiPropertyOptional({
    example: 'KantinBaru123',
    description: 'Password baru akun kantin.',
    minLength: 6,
  })
  @IsOptional()
  @IsString()
  @MinLength(6, { message: 'Password minimal 6 karakter' })
  password?: string;

  @ApiPropertyOptional({
    example: '081234567890',
    description: 'Nomor handphone pengelola kantin.',
  })
  @IsOptional()
  @IsString()
  noHp?: string;

  @ApiPropertyOptional({
    example: true,
    description: 'Status aktif akun kantin.',
  })
  @Type(() => Boolean)
  @IsOptional()
  @IsBoolean()
  statusAktif?: boolean;
}
