import { Module } from '@nestjs/common';
import { SiswaController } from './siswa.controller';
import { SiswaService } from './siswa.service';
import { DatabaseModule } from '../../database/database.module';
import { StreakModule } from '../streak/streak.module';

@Module({
  imports: [DatabaseModule, StreakModule],
  controllers: [SiswaController],
  providers: [SiswaService],
  exports: [SiswaService],
})
export class SiswaModule {}
