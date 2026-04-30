import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsNotEmpty, IsString, IsInt, Min, IsIn } from 'class-validator';

export class CreateKelasDto {
  @ApiProperty({
    example: '7A',
    description: 'Nama atau label kelas.',
  })
  @IsNotEmpty({ message: 'Nama kelas tidak boleh kosong' })
  @IsString()
  nama: string;

  @ApiProperty({
    example: 7,
    description: 'Tingkat kelas.',
  })
  @Type(() => Number)
  @IsNotEmpty({ message: 'Tingkat tidak boleh kosong' })
  @IsInt()
  @Min(1, { message: 'Tingkat minimal 1' }) // Diubah dari 7 ke 1
  tingkat: number;

  @ApiProperty({
    example: 'SMP',
    enum: ['SD', 'SMP', 'SMA'],
    description: 'Jenjang pendidikan kelas.',
  })
  @IsNotEmpty({ message: 'Jenjang tidak boleh kosong' })
  @IsString()
  @IsIn(['SD', 'SMP', 'SMA'], { message: 'Jenjang harus SD, SMP atau SMA' }) // Ditambah SD
  jenjang: 'SD' | 'SMP' | 'SMA';

  @ApiProperty({
    example: 32,
    description: 'Jumlah kapasitas maksimal siswa dalam kelas.',
  })
  @Type(() => Number)
  @IsNotEmpty({ message: 'Kapasitas maksimal tidak boleh kosong' })
  @IsInt()
  @Min(1, { message: 'Kapasitas minimal 1' })
  kapasitasMaksimal: number;
}
