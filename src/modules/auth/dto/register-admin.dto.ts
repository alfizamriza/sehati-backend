import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsEnum, IsNotEmpty, MinLength } from 'class-validator';
import { UserRole } from '../../../common/enums/user-role.enum';

export class RegisterAdminDto {
  @ApiProperty({
    example: 'admin.sehati',
    description: 'Username untuk akun admin atau kantin.',
  })
  @IsString()
  @IsNotEmpty()
  username!: string;

  @ApiProperty({
    example: 'Password123',
    minLength: 6,
    description: 'Password akun dengan minimal 6 karakter.',
  })
  @IsString()
  @MinLength(6)
  @IsNotEmpty()
  password!: string;

  @ApiProperty({
    example: 'Administrator SEHATI',
    description: 'Nama lengkap pengguna yang akan didaftarkan.',
  })
  @IsString()
  @IsNotEmpty()
  nama!: string;

  @ApiProperty({
    example: UserRole.ADMIN,
    enum: [UserRole.ADMIN, UserRole.KANTIN],
    description: 'Role akun yang akan dibuat.',
  })
  @IsEnum([UserRole.ADMIN, UserRole.KANTIN])
  @IsNotEmpty()
  role!: UserRole;
}
