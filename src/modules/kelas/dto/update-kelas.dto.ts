import { IsOptional, IsString, IsInt, Min, IsIn } from 'class-validator';

export class UpdateKelasDto {
  @IsOptional()
  @IsString()
  nama?: string;

  @IsOptional()
  @IsInt()
  @Min(1, { message: 'Tingkat minimal 1' }) // Diubah dari 7 ke 1
  tingkat?: number;

  @IsOptional()
  @IsString()
  @IsIn(['SD', 'SMP', 'SMA'], { message: 'Jenjang harus SD, SMP atau SMA' }) // Ditambah SD
  jenjang?: 'SD' | 'SMP' | 'SMA';

  @IsOptional()
  @IsInt()
  @Min(1, { message: 'Kapasitas minimal 1' })
  kapasitasMaksimal?: number;
}
