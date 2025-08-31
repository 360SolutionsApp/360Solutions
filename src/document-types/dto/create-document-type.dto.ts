import { IsOptional, IsString } from 'class-validator';

export class CreateDocumentTypeDto {
  @IsOptional()
  id?: number;

  @IsString()
  name: string;
}
