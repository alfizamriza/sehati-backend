import {
  IsNotEmpty, IsString, IsOptional,
  IsBoolean, MinLength, Matches,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class CreateKantinDto {
  @ApiProperty({
    example: 'Kantin Sehat',
    description: 'Nama kantin.',
  })
  @IsNotEmpty({ message: 'Nama kantin tidak boleh kosong' })
  @IsString()
  nama!: string;

  @ApiProperty({
    example: 'kantin_sehat',
    description: 'Username akun kantin.',
  })
  @IsNotEmpty({ message: 'Username tidak boleh kosong' })
  @IsString()
  @Matches(/^[a-zA-Z0-9_]+$/, {
    message: 'Username hanya boleh huruf, angka, dan underscore',
  })
  username!: string;

  @ApiProperty({
    example: 'Kantin123',
    description: 'Password akun kantin.',
    minLength: 6,
  })
  @IsNotEmpty({ message: 'Password tidak boleh kosong' })
  @IsString()
  @MinLength(6, { message: 'Password minimal 6 karakter' })
  password!: string;

  @ApiPropertyOptional({
    example: '081234567890',
    description: 'Nomor handphone pengelola kantin.',
  })
  @IsOptional()
  @IsString()
  noHp?: string;

  @ApiPropertyOptional({
    example: true,
    description: 'Status aktif akun kantin.',
  })
  @Type(() => Boolean)
  @IsOptional()
  @IsBoolean()
  statusAktif?: boolean;
}
