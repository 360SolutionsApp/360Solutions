import { Test, TestingModule } from '@nestjs/testing';
import { WorkOrderAcceptController } from './work-order-accept.controller';
import { WorkOrderAcceptService } from './work-order-accept.service';

describe('WorkOrderAcceptController', () => {
  let controller: WorkOrderAcceptController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [WorkOrderAcceptController],
      providers: [WorkOrderAcceptService],
    }).compile();

    controller = module.get<WorkOrderAcceptController>(WorkOrderAcceptController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
