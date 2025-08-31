import { IsOptional, IsString } from 'class-validator';

export class CreateRoleDto {
  @IsOptional()
  id: number;

  @IsString()
  name: string;
}
