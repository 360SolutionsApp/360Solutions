import { PartialType } from '@nestjs/mapped-types';
import { CreateBreakPointDto } from './create-break-point.dto';

export class UpdateBreakPointDto extends PartialType(CreateBreakPointDto) {}
