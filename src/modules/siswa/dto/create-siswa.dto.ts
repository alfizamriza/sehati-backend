import { IsNotEmpty, IsString, IsInt, IsBoolean, IsOptional, MinLength, Length } from 'class-validator';

export class CreateSiswaDto {
  @IsNotEmpty({ message: 'NIS tidak boleh kosong' })
  @IsString()
  @Length(10, 20, { message: 'NIS harus 10-20 karakter' })
  nis!: string;

  @IsNotEmpty({ message: 'Nama tidak boleh kosong' })
  @IsString()
  nama!: string;

  @IsNotEmpty({ message: 'Kelas ID tidak boleh kosong' })
  @IsInt()
  kelasId!: number;

  @IsNotEmpty({ message: 'Password tidak boleh kosong' })
  @IsString()
  @MinLength(6, { message: 'Password minimal 6 karakter' })
  password!: string;

  @IsOptional()
  @IsBoolean()
  statusAktif?: boolean;
}