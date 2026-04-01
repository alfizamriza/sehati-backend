import { Type } from 'class-transformer';
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
  @IsInt()
  @Min(1)
  produkId: number;

  @IsInt()
  @Min(1)
  quantity: number;

  @ValidateIf((o) => typeof o.isByoc === 'boolean')
  isByoc?: boolean;
}

export class CreateTransaksiDto {
  @IsOptional()
  @IsIn(['siswa', 'guru', 'umum'])
  tipePelanggan?: 'siswa' | 'guru' | 'umum';

  @IsOptional()
  @IsString()
  nis?: string;

  @IsOptional()
  @IsString()
  nip?: string;

  @IsOptional()
  @IsString()
  namaUmum?: string;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreateItemDto)
  items: CreateItemDto[];

  @IsIn(['voucher', 'tunai', 'ngutang'])
  paymentMethod: 'voucher' | 'tunai' | 'ngutang';

  @IsOptional()
  @IsInt()
  @Min(0)
  nominalDibayar?: number;

  @ValidateIf((o) => o.paymentMethod === 'voucher')
  @IsInt()
  @Min(1)
  voucherId?: number;
}

export class LookupSiswaDto {
  @IsString()
  @IsNotEmpty()
  nis: string;
}

export class CekVoucherDto {
  @IsString()
  @IsNotEmpty()
  kodeVoucher: string;

  @IsString()
  @IsNotEmpty()
  nis: string;
}
