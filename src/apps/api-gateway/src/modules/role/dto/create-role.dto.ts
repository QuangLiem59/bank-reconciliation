import { IsArray, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { EntityId } from 'src/types/common.type';

export class CreateRoleDto {
  @IsNotEmpty()
  @IsString()
  name: string;

  @IsNotEmpty()
  @IsString()
  description: string;

  @IsArray()
  @IsOptional()
  permissions: EntityId[];
}
