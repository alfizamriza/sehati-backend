import { IsDateString, IsIn, IsNotEmpty, IsOptional, IsString, Length } from 'class-validator';

export class CreateIzinDto {
  @IsString()
  @IsNotEmpty()
  @Length(4, 24)
  nis: string;

  @IsDateString()
  tanggal: string;

  @IsString()
  @IsIn(['sakit', 'izin', 'tanpa_keterangan'])
  tipe: 'sakit' | 'izin' | 'tanpa_keterangan';

  @IsOptional()
  @IsString()
  catatan?: string;
}
