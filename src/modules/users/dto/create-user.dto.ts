import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsEnum, IsOptional, IsString, MinLength } from 'class-validator';
import { UsersRole } from '../enums/users-role.enum';
import { UsersStatus } from '../enums/users-status.enum';

export class CreateUserDto {
  @ApiProperty({ example: 'Ana Pérez' })
  @IsString()
  name: string;

  @ApiProperty({ example: 'ana@example.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'secret123', minLength: 6 })
  @IsString()
  @MinLength(6)
  password: string;

  @ApiProperty({ example: '809-555-0101' })
  @IsString()
  phone: string;

  @ApiProperty({ enum: UsersRole, required: false })
  @IsOptional()
  @IsEnum(UsersRole)
  role?: UsersRole;

  @ApiProperty({ enum: UsersStatus, required: false })
  @IsOptional()
  @IsEnum(UsersStatus)
  status?: UsersStatus;
}
