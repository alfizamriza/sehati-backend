import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsEnum, MinLength } from 'class-validator';
import { UserRole } from '../../../common/enums/user-role.enum';

export class LoginDto {
  @ApiProperty({
    example: 'siswa',
    enum: UserRole,
    description: 'User role',
  })
  @IsEnum(UserRole)
  @IsNotEmpty({ message: 'Role wajib diisi' })
  role!: UserRole;

  @ApiProperty({
    example: '1234567890',
    description: 'NIS untuk siswa, NIP untuk guru, username untuk kantin/admin',
  })
  @IsString()
  @IsNotEmpty({ message: 'Identifier wajib diisi' })
  identifier!: string;

  @ApiProperty({
    example: 'password123',
    minLength: 6,
    description: 'User password',
  })
  @IsString()
  @IsNotEmpty({ message: 'Password wajib diisi' })
  @MinLength(6, { message: 'Password minimal 6 karakter' })
  password!: string;
}