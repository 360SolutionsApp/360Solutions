import { PartialType } from '@nestjs/mapped-types';
import { CreateSurchargeDto } from './create-surcharge.dto';

export class UpdateSurchargeDto extends PartialType(CreateSurchargeDto) {}
