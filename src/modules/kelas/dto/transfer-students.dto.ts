import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsInt, MinLength, ArrayMinSize } from 'class-validator';

export class TransferStudentsDto {
  @ApiProperty({
    example: ['24010001', '24010002', '24010003'],
    description: 'Daftar NIS siswa yang akan dipindahkan.',
    type: [String],
  })
  @IsArray()
  @ArrayMinSize(1, { message: 'Minimal pilih 1 siswa' })
  siswaList: string[];

  @ApiProperty({
    example: 5,
    description: 'ID kelas tujuan tempat siswa akan dipindahkan.',
  })
  @IsInt()
  targetKelasId: number;
}
