import {
  IsOptional, IsString, IsBoolean, MinLength, Matches,
} from 'class-validator';

export class UpdateKantinDto {
  @IsOptional()
  @IsString()
  nama?: string;

  @IsOptional()
  @IsString()
  @Matches(/^[a-zA-Z0-9_]+$/, {
    message: 'Username hanya boleh huruf, angka, dan underscore',
  })
  username?: string;

  @IsOptional()
  @IsString()
  @MinLength(6, { message: 'Password minimal 6 karakter' })
  password?: string;

  @IsOptional()
  @IsString()
  noHp?: string;

  @IsOptional()
  @IsBoolean()
  statusAktif?: boolean;
}