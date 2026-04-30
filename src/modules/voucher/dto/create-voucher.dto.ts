import {
  IsNotEmpty, IsString, IsInt, IsIn,
  IsDateString, Min, IsOptional,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class CreateVoucherDto {
  @ApiProperty({
    example: 'Voucher Awal Semester',
    description: 'Nama voucher.',
  })
  @IsNotEmpty({ message: 'Nama voucher tidak boleh kosong' })
  @IsString()
  namaVoucher!: string;

  @ApiProperty({
    example: '2026-04-22',
    description: 'Tanggal mulai berlakunya voucher.',
  })
  @IsNotEmpty({ message: 'Tanggal berlaku tidak boleh kosong' })
  @IsDateString()
  tanggalBerlaku!: string; // Format: YYYY-MM-DD

  @ApiProperty({
    example: '2026-05-22',
    description: 'Tanggal berakhir voucher.',
  })
  @IsNotEmpty({ message: 'Tanggal berakhir tidak boleh kosong' })
  @IsDateString()
  tanggalBerakhir!: string; // Format: YYYY-MM-DD

  @ApiProperty({
    example: '24010001',
    description: 'NIS siswa penerima voucher.',
  })
  @IsNotEmpty({ message: 'NIS penerima tidak boleh kosong' })
  @IsString()
  nis!: string;

  @ApiProperty({
    example: 5000,
    description: 'Nominal atau nilai potongan voucher.',
  })
  @Type(() => Number)
  @IsNotEmpty({ message: 'Nominal voucher tidak boleh kosong' })
  @IsInt()
  @Min(1, { message: 'Nominal minimal 1' })
  nominalVoucher!: number;

  @ApiProperty({
    example: 'fixed',
    enum: ['percentage', 'fixed'],
    description: 'Tipe voucher berupa persentase atau nominal tetap.',
  })
  @IsNotEmpty({ message: 'Tipe voucher tidak boleh kosong' })
  @IsIn(['percentage', 'fixed'], {
    message: 'Tipe voucher harus percentage atau fixed',
  })
  tipeVoucher!: 'percentage' | 'fixed';

  @ApiPropertyOptional({
    example: 'available',
    enum: ['available', 'used', 'expired'],
    description: 'Status voucher.',
  })
  @IsOptional()
  @IsIn(['available', 'used', 'expired'], {
    message: 'Status harus available, used, atau expired',
  })
  status?: 'available' | 'used' | 'expired';
}
