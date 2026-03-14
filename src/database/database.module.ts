import { Module } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { SiswaRepository } from './repositories/siswa.repository';

@Module({
  providers: [SupabaseService, SiswaRepository],
  exports: [SupabaseService, SiswaRepository],
})
export class DatabaseModule {}
