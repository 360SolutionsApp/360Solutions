import { Test, TestingModule } from '@nestjs/testing';
import { BreakPointsController } from './break-points.controller';
import { BreakPointsService } from './break-points.service';

describe('BreakPointsController', () => {
  let controller: BreakPointsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [BreakPointsController],
      providers: [BreakPointsService],
    }).compile();

    controller = module.get<BreakPointsController>(BreakPointsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
