import { Prop } from '@nestjs/mongoose';
import { ApiProperty } from '@nestjs/swagger';
import {
  IsBoolean,
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';

export class UpdateUserDto {
  @ApiProperty({ description: "User's full name" })
  @IsOptional()
  @IsNotEmpty()
  @IsString()
  name?: string;

  @ApiProperty({ description: 'Unique username for the user' })
  @IsOptional()
  @IsString()
  @Prop({ unique: true })
  username?: string;

  @ApiProperty({ description: 'User workspace' })
  @IsOptional()
  @IsString()
  @Prop({ unique: true })
  workspace?: string;

  @ApiProperty({ description: 'User email address' })
  @IsOptional()
  @IsEmail()
  @Prop({ unique: true })
  email?: string;

  @ApiProperty({ description: 'User password' })
  @IsOptional()
  @IsString()
  @MinLength(6)
  password?: string;

  @ApiProperty({ description: 'User phone number' })
  @IsOptional()
  @IsString()
  @Prop({ unique: true })
  phone?: string;

  @ApiProperty({
    description: 'Indicates if the user is active',
  })
  @IsOptional()
  @IsNotEmpty()
  @IsBoolean()
  active?: boolean;

  @ApiProperty({ description: 'User bio', required: false })
  @IsOptional()
  @IsString()
  bio?: string;

  @ApiProperty({
    description: 'User gender',
    enum: ['male', 'female', 'unspecified'],
    default: 'unspecified',
  })
  @IsOptional()
  @IsString()
  gender?: string;

  @ApiProperty({ description: 'User birthday', required: false })
  @IsOptional()
  birthday?: Date;

  @ApiProperty({ description: 'User address', required: false })
  @IsOptional()
  address?: string;

  @ApiProperty({ description: 'User position', required: false })
  @IsOptional()
  position?: string;

  @ApiProperty({ description: 'User avatar URL', required: false })
  @IsOptional()
  @IsString()
  avatar_url?: string;

  @Prop()
  last_modified_by?: string;
}
