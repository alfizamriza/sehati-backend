import { IsIn } from 'class-validator';

export class UpdateIzinStatusDto {
  @IsIn(['pending', 'approved', 'rejected'])
  status: 'pending' | 'approved' | 'rejected';
}
