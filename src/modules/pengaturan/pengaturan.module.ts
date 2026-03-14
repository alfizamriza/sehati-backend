import { Module } from '@nestjs/common';
import { PengaturanController } from './pengaturan.controller';
import { PengaturanService } from './pengaturan.service';
import { DatabaseModule } from '../../database/database.module';

@Module({
  imports: [DatabaseModule],
  controllers: [PengaturanController],
  providers: [PengaturanService],
  exports: [PengaturanService],
})
export class PengaturanModule {}
