import { IsString, IsNotEmpty, IsOptional, IsNumber, IsPositive } from 'class-validator';
import { Type } from 'class-transformer';

export class CreatePelanggaranDto {
  @IsString()
  @IsNotEmpty({ message: 'NIS siswa wajib diisi' })
  nis: string;

  @IsNumber()
  @IsPositive({ message: 'Jenis pelanggaran wajib dipilih' })
  @Type(() => Number)
  jenis_pelanggaran_id: number;

  @IsOptional()
  @IsString()
  catatan?: string;

  // bukti_foto_url diisi setelah upload
  @IsOptional()
  @IsString()
  bukti_foto_url?: string;
}