import {
  IsNotEmpty, IsString, IsOptional,
  IsBoolean, MinLength, Matches,
} from 'class-validator';

export class CreateKantinDto {
  @IsNotEmpty({ message: 'Nama kantin tidak boleh kosong' })
  @IsString()
  nama!: string;

  @IsNotEmpty({ message: 'Username tidak boleh kosong' })
  @IsString()
  @Matches(/^[a-zA-Z0-9_]+$/, {
    message: 'Username hanya boleh huruf, angka, dan underscore',
  })
  username!: string;

  @IsNotEmpty({ message: 'Password tidak boleh kosong' })
  @IsString()
  @MinLength(6, { message: 'Password minimal 6 karakter' })
  password!: string;

  @IsOptional()
  @IsString()
  noHp?: string;

  @IsOptional()
  @IsBoolean()
  statusAktif?: boolean;
}