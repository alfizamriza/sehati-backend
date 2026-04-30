import {
  IsArray,
  ValidateNested,
  IsString,
  IsNotEmpty,
  MaxLength,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Type, Transform } from 'class-transformer';

class PengaturanItemDto {
  @ApiProperty({
    example: 'jam_masuk',
    description: 'Kunci pengaturan.',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  key: string;

  @ApiProperty({
    example: '07:00',
    description: 'Nilai pengaturan.',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  @Transform(({ value }) => value?.trim())
  value: string;
}

export class BulkUpdatePengaturanDto {
  @ApiProperty({
    type: [PengaturanItemDto],
    description: 'Daftar item pengaturan yang akan diperbarui sekaligus.',
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PengaturanItemDto)
  items: PengaturanItemDto[];
}
