import { PartialType } from '@nestjs/mapped-types';
import { CreateWorkOrderAcceptDto } from './create-work-order-accept.dto';

export class UpdateWorkOrderAcceptDto extends PartialType(CreateWorkOrderAcceptDto) {}
