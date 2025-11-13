import { Test, TestingModule } from '@nestjs/testing';
import { SurchargeController } from './surcharge.controller';
import { SurchargeService } from './surcharge.service';

describe('SurchargeController', () => {
  let controller: SurchargeController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [SurchargeController],
      providers: [SurchargeService],
    }).compile();

    controller = module.get<SurchargeController>(SurchargeController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
