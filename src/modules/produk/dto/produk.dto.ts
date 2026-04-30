import {
  IsBoolean,
  IsBooleanString,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class CreateProdukDto {
  @ApiProperty({
    example: 'Roti Gandum',
    description: 'Nama produk kantin.',
  })
  @IsString()
  @IsNotEmpty()
  nama: string;

  @ApiProperty({
    example: 8000,
    description: 'Harga produk dalam rupiah.',
  })
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  harga: number;

  @ApiProperty({
    example: 20,
    description: 'Stok awal produk.',
  })
  @Type(() => Number)
  @IsInt()
  @Min(0)
  stok: number;

  @ApiProperty({
    example: 'Makanan',
    description: 'Kategori produk.',
  })
  @IsString()
  @IsNotEmpty()
  kategori: string;

  @ApiPropertyOptional({
    example: 'kertas',
    enum: ['plastik', 'kertas', 'tanpa_kemasan'],
    nullable: true,
    description: 'Jenis kemasan produk.',
  })
  @IsOptional()
  @IsIn(['plastik', 'kertas', 'tanpa_kemasan', null] as const)
  jenisKemasan?: 'plastik' | 'kertas' | 'tanpa_kemasan' | null;

  @ApiPropertyOptional({
    example: false,
    description: 'Menandai apakah produk termasuk titipan.',
  })
  @Type(() => Boolean)
  @IsOptional()
  @IsBoolean()
  isTitipan?: boolean;

  @ApiPropertyOptional({
    example: 10,
    description: 'Batas stok harian untuk produk titipan.',
  })
  @Type(() => Number)
  @IsOptional()
  @IsInt()
  @Min(0)
  stokHarian?: number;
}

export class UpdateProdukDto {
  @ApiPropertyOptional({
    example: 'Roti Gandum Premium',
    description: 'Nama produk.',
  })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  nama?: string;

  @ApiPropertyOptional({
    example: 10000,
    description: 'Harga produk dalam rupiah.',
  })
  @Type(() => Number)
  @IsOptional()
  @IsNumber()
  @Min(1)
  harga?: number;

  @ApiPropertyOptional({
    example: 15,
    description: 'Stok produk.',
  })
  @Type(() => Number)
  @IsOptional()
  @IsInt()
  @Min(0)
  stok?: number;

  @ApiPropertyOptional({
    example: 'Makanan',
    description: 'Kategori produk.',
  })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  kategori?: string;

  @ApiPropertyOptional({
    example: 'tanpa_kemasan',
    enum: ['plastik', 'kertas', 'tanpa_kemasan'],
    nullable: true,
    description: 'Jenis kemasan produk.',
  })
  @IsOptional()
  @IsIn(['plastik', 'kertas', 'tanpa_kemasan', null] as const)
  jenisKemasan?: 'plastik' | 'kertas' | 'tanpa_kemasan' | null;

  @ApiPropertyOptional({
    example: true,
    description: 'Status aktif produk.',
  })
  @Type(() => Boolean)
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({
    example: false,
    description: 'Menandai apakah produk termasuk titipan.',
  })
  @Type(() => Boolean)
  @IsOptional()
  @IsBoolean()
  isTitipan?: boolean;

  @ApiPropertyOptional({
    example: 12,
    description: 'Batas stok harian produk.',
  })
  @Type(() => Number)
  @IsOptional()
  @IsInt()
  @Min(0)
  stokHarian?: number;
}

export class ResetStokHarianDto {
  @ApiProperty({
    example: 20,
    description: 'Nilai stok harian baru.',
  })
  @Type(() => Number)
  @IsInt()
  @Min(0)
  stokHarian: number;
}

export class QueryProdukDto {
  @IsOptional()
  @IsString()
  kategori?: string;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsBooleanString()
  isActive?: string;

  @IsOptional()
  @IsBooleanString()
  isTitipan?: string;
}
