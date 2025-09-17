import { Test, TestingModule } from '@nestjs/testing';
import { OrdersAssignToCollabsService } from './orders-assign-to-collabs.service';

describe('OrdersAssignToCollabsService', () => {
  let service: OrdersAssignToCollabsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [OrdersAssignToCollabsService],
    }).compile();

    service = module.get<OrdersAssignToCollabsService>(OrdersAssignToCollabsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
