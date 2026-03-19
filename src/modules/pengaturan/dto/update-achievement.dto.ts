import {
  IsString, IsNotEmpty, IsOptional, IsInt, IsBoolean, IsIn, Min, MaxLength, ValidateIf,
} from 'class-validator';

const TIPE_VALUES = ['streak', 'coins', 'tumbler', 'pelanggaran', 'transaksi'] as const;
const VOUCHER_TIPE_VALUES = ['percentage', 'fixed'] as const;
const PELANGGARAN_MODE_VALUES = ['count', 'no_violation_days'] as const;

export class UpdateAchievementDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  @IsOptional()
  nama?: string;

  @IsString()
  @IsOptional()
  deskripsi?: string;

  @IsString()
  @IsIn(TIPE_VALUES)
  @IsOptional()
  tipe?: (typeof TIPE_VALUES)[number];

  @IsInt()
  @Min(0)
  @IsOptional()
  target_value?: number;

  @ValidateIf((o) => o.tipe === undefined || o.tipe === 'pelanggaran')
  @IsString()
  @IsIn(PELANGGARAN_MODE_VALUES)
  @IsOptional()
  pelanggaran_mode?: (typeof PELANGGARAN_MODE_VALUES)[number];

  @ValidateIf((o) => o.pelanggaran_mode === 'no_violation_days')
  @IsInt()
  @Min(1)
  @IsOptional()
  pelanggaran_period_days?: number | null;

  @IsString()
  @IsOptional()
  @MaxLength(50)
  icon?: string;

  @IsString()
  @IsOptional()
  @MaxLength(20)
  badge_color?: string;

  @IsInt()
  @Min(0)
  @IsOptional()
  coins_reward?: number;

  @IsBoolean()
  @IsOptional()
  is_active?: boolean;

  @IsBoolean()
  @IsOptional()
  voucher_reward?: boolean;

  @ValidateIf((o) => o.voucher_reward === true)
  @IsInt()
  @Min(1)
  @IsOptional()
  voucher_nominal?: number | null;

  @ValidateIf((o) => o.voucher_reward === true)
  @IsString()
  @IsIn(VOUCHER_TIPE_VALUES)
  @IsOptional()
  voucher_tipe_voucher?: (typeof VOUCHER_TIPE_VALUES)[number] | null;
}
