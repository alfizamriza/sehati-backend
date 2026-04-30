import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsNotEmpty, IsString, IsInt, IsBoolean, IsOptional, MinLength, Length, IsArray } from 'class-validator';

export class CreateSiswaDto {
  @ApiProperty({
    example: '24010001',
    description: 'Nomor Induk Siswa (NIS).',
    minLength: 8,
    maxLength: 20,
  })
  @IsNotEmpty({ message: 'NIS tidak boleh kosong' })
  @IsString()
  @Length(8, 20, { message: 'NIS harus 8-20 karakter' })
  nis!: string;

  @ApiProperty({
    example: 'Ahmad Fauzan',
    description: 'Nama lengkap siswa.',
  })
  @IsNotEmpty({ message: 'Nama tidak boleh kosong' })
  @IsString()
  nama!: string;

  @ApiProperty({
    example: 3,
    description: 'ID kelas tempat siswa terdaftar.',
  })
  @Type(() => Number)
  @IsNotEmpty({ message: 'Kelas ID tidak boleh kosong' })
  @IsInt()
  kelasId!: number;

  @ApiProperty({
    example: 'Siswa123',
    description: 'Password awal akun siswa.',
    minLength: 6,
  })
  @IsNotEmpty({ message: 'Password tidak boleh kosong' })
  @IsString()
  @MinLength(6, { message: 'Password minimal 6 karakter' })
  password!: string;

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
