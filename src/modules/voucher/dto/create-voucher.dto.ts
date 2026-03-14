import {
  IsNotEmpty, IsString, IsInt, IsIn,
  IsDateString, Min, IsOptional,
} from 'class-validator';

export class CreateVoucherDto {
  @IsNotEmpty({ message: 'Nama voucher tidak boleh kosong' })
  @IsString()
  namaVoucher!: string;

  @IsNotEmpty({ message: 'Tanggal berlaku tidak boleh kosong' })
  @IsDateString()
  tanggalBerlaku!: string; // Format: YYYY-MM-DD

  @IsNotEmpty({ message: 'Tanggal berakhir tidak boleh kosong' })
  @IsDateString()
  tanggalBerakhir!: string; // Format: YYYY-MM-DD

  @IsNotEmpty({ message: 'NIS penerima tidak boleh kosong' })
  @IsString()
  nis!: string;

  @IsNotEmpty({ message: 'Nominal voucher tidak boleh kosong' })
  @IsInt()
  @Min(1, { message: 'Nominal minimal 1' })
  nominalVoucher!: number;

  @IsNotEmpty({ message: 'Tipe voucher tidak boleh kosong' })
  @IsIn(['percentage', 'fixed'], {
    message: 'Tipe voucher harus percentage atau fixed',
  })
  tipeVoucher!: 'percentage' | 'fixed';

  @IsOptional()
  @IsIn(['available', 'used', 'expired'], {
    message: 'Status harus available, used, atau expired',
  })
  status?: 'available' | 'used' | 'expired';
}