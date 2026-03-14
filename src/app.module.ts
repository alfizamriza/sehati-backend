import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { SupabaseModule } from './supabase/supabase.module';
import { DatabaseModule } from './database/database.module';
import { HealthModule } from './health/health.module';
import { AuthModule } from './modules/auth/auth.module';
import { SiswaModule } from './modules/siswa/siswa.module';
import { GuruModule } from './modules/guru/guru.module';
import { KelasModule } from './modules/kelas/kelas.module';
import { AbsensiModule } from './modules/absensi/absensi.module';
import { ProdukModule } from './modules/produk/produk.module';
import { TransaksiModule } from './modules/transaksi/transaksi.module';
import { VoucherModule } from './modules/voucher/voucher.module';
import { LeaderboardModule } from './modules/leaderboard/leaderboard.module';
import { PengaturanModule } from './modules/pengaturan/pengaturan.module';
import { PelanggaranModule } from './modules/pelanggaran/pelanggaran.module';
import { DashboardModule } from './modules/dashboard/dashboard.module';
import { KantinModule } from './modules/kantin/kantin.module';
import { AchievementModule } from './modules/achievement/achievement.module';
import { RiwayatModule } from './modules/riwayat/riwayat.module';
import { ProfilModule } from './modules/profil/profil.module';
import { RiwayatKantinModule } from './modules/riwayat-kantin/riwayat-kantin.module';
import { AnalyticsModule } from './modules/analytics/analytics.module';
import * as config from './config/app.config';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [config.appConfig, config.jwtConfig, config.databaseConfig, config.corsConfig],
      envFilePath: ['.env.local', '.env'],
    }),
    SupabaseModule,
    DatabaseModule,
    HealthModule,
    AuthModule,
    SiswaModule,
    GuruModule,
    KelasModule,
    AbsensiModule,
    ProdukModule,
    TransaksiModule,
    VoucherModule,
    LeaderboardModule,
    PengaturanModule,
    PelanggaranModule,
    DashboardModule,
    KantinModule,
    AchievementModule,
    RiwayatModule,
    ProfilModule,
    RiwayatKantinModule,
    AnalyticsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}