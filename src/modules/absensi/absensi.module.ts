import { Module } from '@nestjs/common';
import { AbsensiService } from './absensi.service';
import { AbsensiController } from './absensi.controller';
import { AchievementModule } from 'src/modules/achievement/achievement.module';
import { SupabaseModule } from 'src/supabase/supabase.module';
import { StreakModule } from 'src/modules/streak/streak.module';

@Module({
  imports: [
    SupabaseModule,
    AchievementModule, // agar AbsensiService bisa inject AchievementService
    StreakModule,
  ],
  controllers: [AbsensiController],
  providers: [AbsensiService],
  exports: [AbsensiService],
})
export class AbsensiModule {}
