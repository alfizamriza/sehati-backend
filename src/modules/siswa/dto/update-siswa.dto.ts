import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsOptional, IsString, IsInt, IsBoolean, MinLength, IsArray } from 'class-validator';

export class UpdateSiswaDto {
  @ApiPropertyOptional({
    example: 'Ahmad Fauzan',
    description: 'Nama lengkap siswa.',
  })
  @IsOptional()
  @IsString()
  nama?: string;

  @ApiPropertyOptional({
    example: 3,
    description: 'ID kelas terbaru siswa.',
  })
  @Type(() => Number)
  @IsOptional()
  @IsInt()
  kelasId?: number;

  @ApiPropertyOptional({
    example: 'SiswaBaru123',
    description: 'Password baru siswa.',
    minLength: 6,
  })
  @IsOptional()
  @IsString()
  @MinLength(6, { message: 'Password minimal 6 karakter' })
  password?: string;

  @ApiPropertyOptional({
    example: true,
    description: 'Status aktif akun siswa.',
  })
  @Type(() => Boolean)
  @IsOptional()
  @IsBoolean()
  statusAktif?: boolean;

  @ApiPropertyOptional({
    example: ['scan_qr', 'lihat_dashboard'],
    description: 'Daftar permission tambahan untuk siswa.',
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  permissions?: string[];
}
