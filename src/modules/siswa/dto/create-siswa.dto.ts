import { IsNotEmpty, IsString, IsInt, IsBoolean, IsOptional, MinLength, Length, IsArray } from 'class-validator';

export class CreateSiswaDto {
  @IsNotEmpty({ message: 'NIS tidak boleh kosong' })
  @IsString()
  @Length(8, 20, { message: 'NIS harus 8-20 karakter' })
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

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  permissions?: string[];
}