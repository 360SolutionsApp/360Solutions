import { Test, TestingModule } from '@nestjs/testing';
import { WorkOrderAcceptService } from './work-order-accept.service';

describe('WorkOrderAcceptService', () => {
  let service: WorkOrderAcceptService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [WorkOrderAcceptService],
    }).compile();

    service = module.get<WorkOrderAcceptService>(WorkOrderAcceptService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
