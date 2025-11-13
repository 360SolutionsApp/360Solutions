import { Test, TestingModule } from '@nestjs/testing';
import { BreakPointsService } from './break-points.service';

describe('BreakPointsService', () => {
  let service: BreakPointsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [BreakPointsService],
    }).compile();

    service = module.get<BreakPointsService>(BreakPointsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
