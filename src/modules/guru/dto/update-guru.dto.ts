import {
  IsOptional, IsString, IsBoolean,
  IsInt, IsIn, MinLength, ValidateIf,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class UpdateGuruDto {
  @ApiPropertyOptional({
    example: 'Budi Santoso',
    description: 'Nama lengkap guru.',
  })
  @IsOptional()
  @IsString()
  nama?: string;

  @ApiPropertyOptional({
    example: 'GuruBaru123',
    description: 'Password baru akun guru.',
    minLength: 6,
  })
  @IsOptional()
  @IsString()
  @MinLength(6, { message: 'Password minimal 6 karakter' })
  password?: string;

  @ApiPropertyOptional({
    example: 'Matematika',
    description: 'Mata pelajaran yang diampu guru.',
  })
  @IsOptional()
  @IsString()
  mataPelajaran?: string;

  @ApiPropertyOptional({
    example: 'konselor',
    enum: ['guru_mapel', 'wali_kelas', 'konselor'],
    description: 'Peran guru di dalam sistem.',
  })
  @IsOptional()
  @IsIn(['guru_mapel', 'wali_kelas', 'konselor'], {
    message: 'Peran harus: guru_mapel, wali_kelas, atau konselor',
  })
  peran?: 'guru_mapel' | 'wali_kelas' | 'konselor';

  // Wajib jika update peran ke wali_kelas
  @ApiPropertyOptional({
    example: 2,
    description: 'ID kelas wali jika peran diubah menjadi wali_kelas.',
  })
  @ValidateIf((o) => o.peran === 'wali_kelas')
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  kelasWaliId?: number | null;

  @ApiPropertyOptional({
    example: true,
    description: 'Status aktif akun guru.',
  })
  @Type(() => Boolean)
  @IsOptional()
  @IsBoolean()
  statusAktif?: boolean;
}
