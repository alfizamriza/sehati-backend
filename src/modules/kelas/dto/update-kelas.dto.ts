import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsOptional, IsString, IsInt, Min, IsIn } from 'class-validator';

export class UpdateKelasDto {
  @ApiPropertyOptional({
    example: '7A',
    description: 'Nama atau label kelas.',
  })
  @IsOptional()
  @IsString()
  nama?: string;

  @ApiPropertyOptional({
    example: 7,
    description: 'Tingkat kelas.',
  })
  @Type(() => Number)
  @IsOptional()
  @IsInt()
  @Min(1, { message: 'Tingkat minimal 1' }) // Diubah dari 7 ke 1
  tingkat?: number;

  @ApiPropertyOptional({
    example: 'SMP',
    enum: ['SD', 'SMP', 'SMA'],
    description: 'Jenjang pendidikan kelas.',
  })
  @IsOptional()
  @IsString()
  @IsIn(['SD', 'SMP', 'SMA'], { message: 'Jenjang harus SD, SMP atau SMA' }) // Ditambah SD
  jenjang?: 'SD' | 'SMP' | 'SMA';

  @ApiPropertyOptional({
    example: 32,
    description: 'Jumlah kapasitas maksimal siswa dalam kelas.',
  })
  @Type(() => Number)
  @IsOptional()
  @IsInt()
  @Min(1, { message: 'Kapasitas minimal 1' })
  kapasitasMaksimal?: number;
}
