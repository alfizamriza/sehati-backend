import {
  IsNotEmpty, IsString, IsOptional, IsBoolean,
  IsInt, IsIn, MinLength, ValidateIf, Length,
} from 'class-validator';

export class CreateGuruDto {
  @IsNotEmpty({ message: 'NIP tidak boleh kosong' })
  @IsString()
  @Length(8, 20, { message: 'NIP harus 8-20 karakter' })
  nip!: string;

  @IsNotEmpty({ message: 'Nama tidak boleh kosong' })
  @IsString()
  nama!: string;

  @IsNotEmpty({ message: 'Password tidak boleh kosong' })
  @IsString()
  @MinLength(6, { message: 'Password minimal 6 karakter' })
  password!: string;

  @IsOptional()
  @IsString()
  mataPelajaran?: string;

  @IsNotEmpty({ message: 'Peran tidak boleh kosong' })
  @IsIn(['guru_mapel', 'wali_kelas', 'konselor'], {
    message: 'Peran harus: guru_mapel, wali_kelas, atau konselor',
  })
  peran!: 'guru_mapel' | 'wali_kelas' | 'konselor';

  // Wajib hanya jika peran = wali_kelas
  @ValidateIf((o) => o.peran === 'wali_kelas')
  @IsNotEmpty({ message: 'Kelas wali wajib diisi jika peran adalah wali kelas' })
  @IsInt()
  kelasWaliId?: number;

  @IsOptional()
  @IsBoolean()
  statusAktif?: boolean;
}