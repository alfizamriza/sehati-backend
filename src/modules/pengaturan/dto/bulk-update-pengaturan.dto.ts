import {
  IsArray,
  ValidateNested,
  IsString,
  IsNotEmpty,
  MaxLength,
} from 'class-validator';
import { Type, Transform } from 'class-transformer';

class PengaturanItemDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  key: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  @Transform(({ value }) => value?.trim())
  value: string;
}

export class BulkUpdatePengaturanDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PengaturanItemDto)
  items: PengaturanItemDto[];
}