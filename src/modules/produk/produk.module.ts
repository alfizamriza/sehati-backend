import { Module } from '@nestjs/common';
import { ProdukController } from './produk.controller';
import { ProdukService } from './produk.service';
import { DatabaseModule } from '../../database/database.module';

@Module({
  imports: [DatabaseModule],
  controllers: [ProdukController],
  providers: [ProdukService],
  exports: [ProdukService],
})
export class ProdukModule {}
