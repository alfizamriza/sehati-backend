import {
  IsNotEmpty, IsString, IsOptional, IsBoolean,
  IsInt, IsIn, MinLength, ValidateIf, Length,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class CreateGuruDto {
  @ApiProperty({
    example: '1987654321',
    description: 'Nomor Induk Pegawai (NIP) guru.',
    minLength: 8,
    maxLength: 20,
  })
  @IsNotEmpty({ message: 'NIP tidak boleh kosong' })
  @IsString()
  @Length(8, 20, { message: 'NIP harus 8-20 karakter' })
  nip!: string;

  @ApiProperty({
    example: 'Budi Santoso',
    description: 'Nama lengkap guru.',
  })
  @IsNotEmpty({ message: 'Nama tidak boleh kosong' })
  @IsString()
  nama!: string;

  @ApiProperty({
    example: 'Guru123',
    description: 'Password awal akun guru.',
    minLength: 6,
  })
  @IsNotEmpty({ message: 'Password tidak boleh kosong' })
  @IsString()
  @MinLength(6, { message: 'Password minimal 6 karakter' })
  password!: string;

  @ApiPropertyOptional({
    example: 'Matematika',
    description: 'Mata pelajaran yang diampu guru.',
  })
  @IsOptional()
  @IsString()
  mataPelajaran?: string;

  @ApiProperty({
    example: 'wali_kelas',
    enum: ['guru_mapel', 'wali_kelas', 'konselor'],
    description: 'Peran guru di dalam sistem.',
  })
  @IsNotEmpty({ message: 'Peran tidak boleh kosong' })
  @IsIn(['guru_mapel', 'wali_kelas', 'konselor'], {
    message: 'Peran harus: guru_mapel, wali_kelas, atau konselor',
  })
  peran!: 'guru_mapel' | 'wali_kelas' | 'konselor';

  // Wajib hanya jika peran = wali_kelas
  @ApiPropertyOptional({
    example: 2,
    description: 'ID kelas wali. Wajib diisi jika peran adalah wali_kelas.',
  })
  @ValidateIf((o) => o.peran === 'wali_kelas')
  @IsNotEmpty({ message: 'Kelas wali wajib diisi jika peran adalah wali kelas' })
  @Type(() => Number)
  @IsInt()
  kelasWaliId?: number;

  @ApiPropertyOptional({
    example: true,
    description: 'Status aktif akun guru.',
  })
  @Type(() => Boolean)
  @IsOptional()
  @IsBoolean()
  statusAktif?: boolean;
}
