import { Test, TestingModule } from '@nestjs/testing';
import { CheckInCheckOutService } from './check-in-check-out.service';

describe('CheckInCheckOutService', () => {
  let service: CheckInCheckOutService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [CheckInCheckOutService],
    }).compile();

    service = module.get<CheckInCheckOutService>(CheckInCheckOutService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
