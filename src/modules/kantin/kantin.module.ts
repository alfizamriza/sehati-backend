import { Module } from '@nestjs/common';
import { KantinController } from './kantin.controller';
import { KantinService } from './kantin.service';

@Module({
  controllers: [KantinController],
  providers: [KantinService],
  exports: [KantinService],
})
export class KantinModule {}
