import { Module } from '@nestjs/common';
import { HealthController } from './health.controller';
import { SupabaseService } from '../supabase/supabase.service';
import { DatabaseModule } from '../database/database.module';

@Module({
  imports: [DatabaseModule],
  controllers: [HealthController],
})
export class HealthModule {}
