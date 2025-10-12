/* eslint-disable prettier/prettier */
import { PartialType } from '@nestjs/mapped-types';
import { CreateOrdersAssignToCollabDto } from './create-orders-assign-to-collab.dto';

export class UpdateOrdersAssignToCollabDto extends PartialType(
  CreateOrdersAssignToCollabDto,
) {}
