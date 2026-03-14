import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsIn,
  IsInt,
  IsNotEmpty,
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
  @IsString()
  @IsNotEmpty()
  nis: string;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreateItemDto)
  items: CreateItemDto[];

  @IsIn(['voucher', 'tunai'])
  paymentMethod: 'voucher' | 'tunai';

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
