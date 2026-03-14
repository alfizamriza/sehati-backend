import { Module } from '@nestjs/common';
import { KelasController } from './kelas.controller';
import { KelasService } from './kelas.service';
import { DatabaseModule } from '../../database/database.module';

@Module({
  imports: [DatabaseModule],
  controllers: [KelasController],
  providers: [KelasService],
  exports: [KelasService],
})
export class KelasModule {}
