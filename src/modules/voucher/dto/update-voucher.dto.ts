import {
  IsOptional, IsString, IsInt, IsIn,
  IsDateString, Min,
} from 'class-validator';

export class UpdateVoucherDto {
  @IsOptional()
  @IsString()
  namaVoucher?: string;

  @IsOptional()
  @IsDateString()
  tanggalBerlaku?: string;

  @IsOptional()
  @IsDateString()
  tanggalBerakhir?: string;

  @IsOptional()
  @IsString()
  nis?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  nominalVoucher?: number;

  @IsOptional()
  @IsIn(['percentage', 'fixed'])
  tipeVoucher?: 'percentage' | 'fixed';

  @IsOptional()
  @IsIn(['available', 'used', 'expired'])
  status?: 'available' | 'used' | 'expired';
}