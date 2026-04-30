import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';
import { Transform } from 'class-transformer';

export class UpdatePengaturanDto {
  @ApiProperty({
    example: '07:00',
    description: 'Nilai pengaturan yang akan disimpan.',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  @Transform(({ value }) => value?.trim())
  value: string;
}
