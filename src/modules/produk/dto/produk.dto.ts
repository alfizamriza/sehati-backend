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

export class CreateProdukDto {
  @IsString()
  @IsNotEmpty()
  nama: string;

  @IsNumber()
  @Min(1)
  harga: number;

  @IsInt()
  @Min(0)
  stok: number;

  @IsString()
  @IsNotEmpty()
  kategori: string;

  @IsOptional()
  @IsIn(['plastik', 'kertas', 'tanpa_kemasan', null] as const)
  jenisKemasan?: 'plastik' | 'kertas' | 'tanpa_kemasan' | null;

  @IsOptional()
  @IsBoolean()
  isTitipan?: boolean;

  @IsOptional()
  @IsInt()
  @Min(0)
  stokHarian?: number;
}

export class UpdateProdukDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  nama?: string;

  @IsOptional()
  @IsNumber()
  @Min(1)
  harga?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  stok?: number;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  kategori?: string;

  @IsOptional()
  @IsIn(['plastik', 'kertas', 'tanpa_kemasan', null] as const)
  jenisKemasan?: 'plastik' | 'kertas' | 'tanpa_kemasan' | null;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsBoolean()
  isTitipan?: boolean;

  @IsOptional()
  @IsInt()
  @Min(0)
  stokHarian?: number;
}

export class ResetStokHarianDto {
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
