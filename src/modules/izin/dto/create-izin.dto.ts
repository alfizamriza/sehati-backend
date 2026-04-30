import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsIn, IsNotEmpty, IsOptional, IsString, Length } from 'class-validator';

export class CreateIzinDto {
  @ApiProperty({
    example: '24010001',
    description: 'NIS siswa yang mengajukan izin.',
  })
  @IsString()
  @IsNotEmpty()
  @Length(4, 24)
  nis: string;

  @ApiProperty({
    example: '2026-04-22',
    description: 'Tanggal izin.',
  })
  @IsDateString()
  tanggal: string;

  @ApiProperty({
    example: 'izin',
    enum: ['sakit', 'izin', 'tanpa_keterangan'],
    description: 'Jenis izin siswa.',
  })
  @IsString()
  @IsIn(['sakit', 'izin', 'tanpa_keterangan'])
  tipe: 'sakit' | 'izin' | 'tanpa_keterangan';

  @ApiPropertyOptional({
    example: 'Mengikuti kegiatan keluarga.',
    description: 'Catatan tambahan izin.',
  })
  @IsOptional()
  @IsString()
  catatan?: string;
}
