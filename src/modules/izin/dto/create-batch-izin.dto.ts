import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsArray, IsDateString, IsIn, IsOptional, IsString, ArrayMinSize } from 'class-validator';

export class CreateBatchIzinDto {
    @ApiProperty({
        example: ['24010001', '24010002'],
        type: [String],
        description: 'Daftar NIS siswa yang diajukan izin secara batch.',
    })
    @Transform(({ value, obj }) => value ?? obj.nis_list)
    @IsArray()
    @ArrayMinSize(1)
    @IsString({ each: true })
    nisList: string[];

    @ApiProperty({
        example: '2026-04-22',
        description: 'Tanggal izin.',
    })
    @IsDateString()
    tanggal: string;

    @ApiProperty({
        example: 'sakit',
        enum: ['sakit', 'izin', 'tanpa_keterangan'],
        description: 'Jenis izin batch.',
    })
    @IsIn(['sakit', 'izin', 'tanpa_keterangan'])
    tipe: string;

    @ApiPropertyOptional({
        example: 'Kegiatan luar sekolah.',
        description: 'Catatan tambahan izin batch.',
    })
    @IsOptional()
    @IsString()
    catatan?: string;
}
