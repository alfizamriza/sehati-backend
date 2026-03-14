import { Test, TestingModule } from '@nestjs/testing';
import { RiwayatKantinController } from './riwayat-kantin.controller';

describe('RiwayatKantinController', () => {
  let controller: RiwayatKantinController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [RiwayatKantinController],
    }).compile();

    controller = module.get<RiwayatKantinController>(RiwayatKantinController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
