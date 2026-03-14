import { IsString, IsEnum, IsNotEmpty, MinLength } from 'class-validator';
import { UserRole } from '../../../common/enums/user-role.enum';

export class RegisterAdminDto {
  @IsString()
  @IsNotEmpty()
  username!: string;

  @IsString()
  @MinLength(6)
  @IsNotEmpty()
  password!: string;

  @IsString()
  @IsNotEmpty()
  nama!: string;

  @IsEnum([UserRole.ADMIN, UserRole.KANTIN])
  @IsNotEmpty()
  role!: UserRole;
}