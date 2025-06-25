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

export class CreateUserDto {
  @ApiProperty({ description: "User's full name" })
  @IsNotEmpty()
  @IsString()
  @Prop({ required: true })
  name: string;

  @ApiProperty({ description: 'Unique username for the user', required: false })
  @IsOptional()
  @IsString()
  @Prop({ required: true, unique: true })
  username: string;

  @ApiProperty({ description: 'User workspace', required: false })
  @IsOptional()
  @IsString()
  @Prop({ unique: true })
  workspace?: string;

  @ApiProperty({ description: 'User email address' })
  @IsEmail()
  @Prop({ required: true, unique: true })
  email: string;

  @ApiProperty({ description: 'User password' })
  @IsNotEmpty()
  @IsString()
  @MinLength(6)
  @Prop({ required: true })
  password: string;

  @ApiProperty({ description: 'User phone number', required: false })
  @IsOptional()
  @IsString()
  @Prop({ unique: true })
  phone?: string;

  @ApiProperty({
    description: 'Indicates if the user is active',
    default: true,
    required: false,
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
    required: false,
  })
  @IsOptional()
  @IsString()
  gender?: string;

  @ApiProperty({ description: 'User birthday', required: false })
  @IsOptional()
  birthday?: Date;

  @ApiProperty({ description: 'User avatar URL', required: false })
  @IsOptional()
  @IsString()
  avatar_url?: string;

  @ApiProperty({ description: 'User address', required: false })
  @IsOptional()
  address?: string;

  @ApiProperty({ description: 'User position', required: false })
  @IsOptional()
  position?: string;

  @IsOptional()
  social_provider?: string;

  @IsOptional()
  social_id?: string;

  @Prop()
  last_modified_by?: string;
}
