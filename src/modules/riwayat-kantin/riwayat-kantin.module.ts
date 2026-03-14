import { Module } from '@nestjs/common';
import { RiwayatKantinController } from './riwayat-kantin.controller';
import { RiwayatKantinService } from './riwayat-kantin.service';
import { SupabaseModule } from 'src/supabase/supabase.module';

@Module({
  imports: [SupabaseModule],
  controllers: [RiwayatKantinController],
  providers: [RiwayatKantinService],
  exports: [RiwayatKantinService],
})
export class RiwayatKantinModule {}