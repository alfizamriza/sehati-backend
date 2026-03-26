import { Module } from '@nestjs/common';
import { SiswaDashboardController } from './controllers/siswa-dashboard.controller';
import { GuruDashboardController } from './controllers/guru-dashboard.controller';
import { KantinDashboardController } from './controllers/kantin-dashboard.controller';
import { AdminDashboardController } from './controllers/admin-dashboard.controller';
import { SiswaDashboardService } from './services/siswa-dashboard.service';
import { GuruDashboardService } from './services/guru-dashboard.service';
import { KantinDashboardService } from './services/kantin-dashboard.service';
import { AdminDashboardService } from './services/admin-dashboard.service';
import { DatabaseModule } from '../../database/database.module';
import { StreakModule } from '../streak/streak.module';
import { LeaderboardModule } from '../leaderboard/leaderboard.module';


@Module({
  imports: [DatabaseModule, StreakModule, LeaderboardModule],
  controllers: [SiswaDashboardController, GuruDashboardController, KantinDashboardController, AdminDashboardController],
  providers: [SiswaDashboardService, GuruDashboardService, KantinDashboardService, AdminDashboardService],
  exports: [SiswaDashboardService, GuruDashboardService, KantinDashboardService, AdminDashboardService],
})
export class DashboardModule {}
