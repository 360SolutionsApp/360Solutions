import { PartialType } from '@nestjs/mapped-types';
import { CreateCheckInCheckOutDto } from './create-check-in-check-out.dto';

export class UpdateCheckInCheckOutDto extends PartialType(CreateCheckInCheckOutDto) {}
