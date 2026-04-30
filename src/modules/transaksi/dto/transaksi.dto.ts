import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayMinSize,
  IsArray,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Min,
  ValidateIf,
  ValidateNested,
} from 'class-validator';

export class CreateItemDto {
  @ApiProperty({
    example: 1,
    description: 'ID produk yang dibeli.',
  })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  produkId: number;

  @ApiProperty({
    example: 2,
    description: 'Jumlah item yang dibeli.',
  })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  quantity: number;

  @ApiPropertyOptional({
    example: true,
    description: 'Menandai apakah pembeli membawa wadah sendiri.',
  })
  @ValidateIf((o) => typeof o.isByoc === 'boolean')
  isByoc?: boolean;
}

export class CreateTransaksiDto {
  @ApiPropertyOptional({
    example: 'siswa',
    enum: ['siswa', 'guru', 'umum'],
    description: 'Tipe pelanggan yang melakukan transaksi.',
  })
  @IsOptional()
  @IsIn(['siswa', 'guru', 'umum'])
  tipePelanggan?: 'siswa' | 'guru' | 'umum';

  @ApiPropertyOptional({
    example: '24010001',
    description: 'NIS siswa jika tipe pelanggan adalah siswa.',
  })
  @IsOptional()
  @IsString()
  nis?: string;

  @ApiPropertyOptional({
    example: '1987654321',
    description: 'NIP guru jika tipe pelanggan adalah guru.',
  })
  @IsOptional()
  @IsString()
  nip?: string;

  @ApiPropertyOptional({
    example: 'Pengunjung Umum',
    description: 'Nama pelanggan jika tipe pelanggan adalah umum.',
  })
  @IsOptional()
  @IsString()
  namaUmum?: string;

  @ApiProperty({
    type: [CreateItemDto],
    description: 'Daftar item yang dibeli dalam transaksi.',
  })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreateItemDto)
  items: CreateItemDto[];

  @ApiProperty({
    example: 'tunai',
    enum: ['voucher', 'tunai', 'ngutang'],
    description: 'Metode pembayaran transaksi.',
  })
  @IsIn(['voucher', 'tunai', 'ngutang'])
  paymentMethod: 'voucher' | 'tunai' | 'ngutang';

  @ApiPropertyOptional({
    example: 15000,
    description: 'Nominal uang yang dibayarkan pelanggan.',
  })
  @Type(() => Number)
  @IsOptional()
  @IsInt()
  @Min(0)
  nominalDibayar?: number;

  @ApiPropertyOptional({
    example: 5,
    description: 'ID voucher jika metode pembayaran adalah voucher.',
  })
  @Type(() => Number)
  @ValidateIf((o) => o.paymentMethod === 'voucher')
  @IsInt()
  @Min(1)
  voucherId?: number;
}

export class LookupSiswaDto {
  @ApiProperty({
    example: '24010001',
    description: 'NIS siswa yang dicari.',
  })
  @IsString()
  @IsNotEmpty()
  nis: string;
}

export class CekVoucherDto {
  @ApiProperty({
    example: 'HEMAT5K',
    description: 'Kode voucher yang akan divalidasi.',
  })
  @IsString()
  @IsNotEmpty()
  kodeVoucher: string;

  @ApiProperty({
    example: '24010001',
    description: 'NIS penerima voucher.',
  })
  @IsString()
  @IsNotEmpty()
  nis: string;
}
