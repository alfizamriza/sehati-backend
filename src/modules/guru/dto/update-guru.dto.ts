import {
  IsOptional, IsString, IsBoolean,
  IsInt, IsIn, MinLength, ValidateIf,
} from 'class-validator';

export class UpdateGuruDto {
  @IsOptional()
  @IsString()
  nama?: string;

  @IsOptional()
  @IsString()
  @MinLength(6, { message: 'Password minimal 6 karakter' })
  password?: string;

  @IsOptional()
  @IsString()
  mataPelajaran?: string;

  @IsOptional()
  @IsIn(['guru_mapel', 'wali_kelas', 'konselor'], {
    message: 'Peran harus: guru_mapel, wali_kelas, atau konselor',
  })
  peran?: 'guru_mapel' | 'wali_kelas' | 'konselor';

  // Wajib jika update peran ke wali_kelas
  @ValidateIf((o) => o.peran === 'wali_kelas')
  @IsOptional()
  @IsInt()
  kelasWaliId?: number | null;

  @IsOptional()
  @IsBoolean()
  statusAktif?: boolean;
}