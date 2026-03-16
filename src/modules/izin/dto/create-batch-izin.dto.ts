import { IsArray, IsDateString, IsIn, IsOptional, IsString, ArrayMinSize } from 'class-validator';

export class CreateBatchIzinDto {
    @IsArray()
    @ArrayMinSize(1)
    @IsString({ each: true })
    nis_list: string[];

    @IsDateString()
    tanggal: string;

    @IsIn(['sakit', 'izin', 'tanpa_keterangan'])
    tipe: string;

    @IsOptional()
    @IsString()
    catatan?: string;
}