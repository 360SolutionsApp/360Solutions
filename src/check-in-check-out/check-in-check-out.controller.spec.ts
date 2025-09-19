import { Test, TestingModule } from '@nestjs/testing';
import { CheckInCheckOutController } from './check-in-check-out.controller';
import { CheckInCheckOutService } from './check-in-check-out.service';

describe('CheckInCheckOutController', () => {
  let controller: CheckInCheckOutController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CheckInCheckOutController],
      providers: [CheckInCheckOutService],
    }).compile();

    controller = module.get<CheckInCheckOutController>(CheckInCheckOutController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
