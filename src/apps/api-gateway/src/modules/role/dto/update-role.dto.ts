import { IsArray, IsOptional, IsString } from 'class-validator';
import { EntityId } from 'src/types/common.type';

export class UpdateRoleDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsArray()
  @IsOptional()
  permissions?: EntityId[];
}
