import {
  IsOptional, IsString, IsInt, IsIn,
  IsDateString, Min,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class UpdateVoucherDto {
  @ApiPropertyOptional({
    example: 'Voucher Akhir Semester',
    description: 'Nama voucher.',
  })
  @IsOptional()
  @IsString()
  namaVoucher?: string;

  @ApiPropertyOptional({
    example: '2026-04-22',
    description: 'Tanggal mulai berlakunya voucher.',
  })
  @IsOptional()
  @IsDateString()
  tanggalBerlaku?: string;

  @ApiPropertyOptional({
    example: '2026-05-22',
    description: 'Tanggal berakhir voucher.',
  })
  @IsOptional()
  @IsDateString()
  tanggalBerakhir?: string;

  @ApiPropertyOptional({
    example: '24010001',
    description: 'NIS siswa penerima voucher.',
  })
  @IsOptional()
  @IsString()
  nis?: string;

  @ApiPropertyOptional({
    example: 10000,
    description: 'Nominal atau nilai potongan voucher.',
  })
  @Type(() => Number)
  @IsOptional()
  @IsInt()
  @Min(1)
  nominalVoucher?: number;

  @ApiPropertyOptional({
    example: 'percentage',
    enum: ['percentage', 'fixed'],
    description: 'Tipe voucher.',
  })
  @IsOptional()
  @IsIn(['percentage', 'fixed'])
  tipeVoucher?: 'percentage' | 'fixed';

  @ApiPropertyOptional({
    example: 'used',
    enum: ['available', 'used', 'expired'],
    description: 'Status voucher.',
  })
  @IsOptional()
  @IsIn(['available', 'used', 'expired'])
  status?: 'available' | 'used' | 'expired';
}
