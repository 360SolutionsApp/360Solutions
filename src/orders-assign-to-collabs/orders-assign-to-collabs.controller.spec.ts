import { Test, TestingModule } from '@nestjs/testing';
import { OrdersAssignToCollabsController } from './orders-assign-to-collabs.controller';
import { OrdersAssignToCollabsService } from './orders-assign-to-collabs.service';

describe('OrdersAssignToCollabsController', () => {
  let controller: OrdersAssignToCollabsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [OrdersAssignToCollabsController],
      providers: [OrdersAssignToCollabsService],
    }).compile();

    controller = module.get<OrdersAssignToCollabsController>(OrdersAssignToCollabsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
