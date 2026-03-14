import { Module } from '@nestjs/common';
import { RiwayatController } from './riwayat.controller';
import { RiwayatService } from './riwayat.service';
import { SupabaseModule } from 'src/supabase/supabase.module';

@Module({
  imports: [SupabaseModule],
  controllers: [RiwayatController],
  providers: [RiwayatService],
  exports: [RiwayatService],
})
export class RiwayatModule {}