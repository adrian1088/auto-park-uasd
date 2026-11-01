import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsEnum, IsOptional, Length } from 'class-validator';
import { UserRole } from '../enums/users-role.enum';

export class CreateUserDto {
  @ApiProperty({ example: 'Ana Pérez' })
  @Length(3, 255, { message: 'El nombre debe tener entre 3 y 255 caracteres' })
  name: string;

  @ApiProperty({ example: 'ana@example.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: '809-555-0101' })
  @Length(10, 15, { message: 'El número de teléfono debe tener entre 10 y 15 caracteres' })
  phone: string;

  @ApiProperty({ enum: UserRole, required: false })
  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole;
}
