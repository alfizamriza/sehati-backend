import { IsString, IsNotEmpty, IsOptional, IsNumber, IsPositive } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreatePelanggaranDto {
  @ApiProperty({
    example: '24010001',
    description: 'NIS siswa yang dilaporkan.',
  })
  @IsString()
  @IsNotEmpty({ message: 'NIS siswa wajib diisi' })
  nis: string;

  @ApiProperty({
    example: 3,
    description: 'ID jenis pelanggaran.',
  })
  @IsNumber()
  @IsPositive({ message: 'Jenis pelanggaran wajib dipilih' })
  @Type(() => Number)
  jenis_pelanggaran_id: number;

  @ApiPropertyOptional({
    example: 'Siswa tidak memakai tumbler saat pembelian.',
    description: 'Catatan tambahan pelanggaran.',
  })
  @IsOptional()
  @IsString()
  catatan?: string;

  // bukti_foto_url diisi setelah upload
  @ApiPropertyOptional({
    example: 'https://storage.example.com/bukti/pelanggaran-1.jpg',
    description: 'URL bukti foto pelanggaran.',
  })
  @IsOptional()
  @IsString()
  bukti_foto_url?: string;
}
