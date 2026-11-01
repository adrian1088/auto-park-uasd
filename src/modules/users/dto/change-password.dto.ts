import { ApiProperty } from '@nestjs/swagger';
import { MinLength } from 'class-validator';

export class ChangePasswordDto {
  @ApiProperty({ description: 'Current password' })
  @MinLength(8, { message: 'La contraseña actual debe tener al menos 8 caracteres' })
  oldPassword: string;
  
  @ApiProperty({ description: 'New password' })
  @MinLength(8, { message: 'La nueva contraseña debe tener al menos 8 caracteres' })
  newPassword: string;
}
