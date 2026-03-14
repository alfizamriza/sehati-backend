import { IsNotEmpty, IsString, IsInt, Min, IsIn } from 'class-validator';

export class CreateKelasDto {
  @IsNotEmpty({ message: 'Nama kelas tidak boleh kosong' })
  @IsString()
  nama: string;

  @IsNotEmpty({ message: 'Tingkat tidak boleh kosong' })
  @IsInt()
  @Min(1, { message: 'Tingkat minimal 1' }) // Diubah dari 7 ke 1
  tingkat: number;

  @IsNotEmpty({ message: 'Jenjang tidak boleh kosong' })
  @IsString()
  @IsIn(['SD', 'SMP', 'SMA'], { message: 'Jenjang harus SD, SMP atau SMA' }) // Ditambah SD
  jenjang: 'SD' | 'SMP' | 'SMA';

  @IsNotEmpty({ message: 'Kapasitas maksimal tidak boleh kosong' })
  @IsInt()
  @Min(1, { message: 'Kapasitas minimal 1' })
  kapasitasMaksimal: number;
}