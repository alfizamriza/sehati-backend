import { Module } from '@nestjs/common';
import { PelanggaranController } from './pelanggaran.controller';
import { PelanggaranService } from './pelanggaran.service';
import { DatabaseModule } from '../../database/database.module';

@Module({
  imports: [DatabaseModule],
  controllers: [PelanggaranController],
  providers: [PelanggaranService],
  exports: [PelanggaranService],
})
export class PelanggaranModule {}
