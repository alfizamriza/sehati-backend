import { Module } from '@nestjs/common';
import { ProfilController } from './profil.controller';
import { ProfilService } from './profil.service';
import { SupabaseModule } from 'src/supabase/supabase.module';
import { StreakModule } from 'src/modules/streak/streak.module';

@Module({
  imports: [SupabaseModule, StreakModule],
  controllers: [ProfilController],
  providers: [ProfilService],
  exports: [ProfilService],
})
export class ProfilModule {}
