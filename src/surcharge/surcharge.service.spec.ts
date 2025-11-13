import { Test, TestingModule } from '@nestjs/testing';
import { SurchargeService } from './surcharge.service';

describe('SurchargeService', () => {
  let service: SurchargeService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [SurchargeService],
    }).compile();

    service = module.get<SurchargeService>(SurchargeService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
