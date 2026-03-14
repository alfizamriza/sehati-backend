import { Test, TestingModule } from '@nestjs/testing';
import { RiwayatKantinService } from './riwayat-kantin.service';

describe('RiwayatKantinService', () => {
  let service: RiwayatKantinService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [RiwayatKantinService],
    }).compile();

    service = module.get<RiwayatKantinService>(RiwayatKantinService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
