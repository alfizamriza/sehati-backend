import { ApiProperty } from '@nestjs/swagger';
import { IsIn } from 'class-validator';

export class UpdateIzinStatusDto {
  @ApiProperty({
    example: 'approved',
    enum: ['pending', 'approved', 'rejected'],
    description: 'Status baru untuk data izin.',
  })
  @IsIn(['pending', 'approved', 'rejected'])
  status: 'pending' | 'approved' | 'rejected';
}
