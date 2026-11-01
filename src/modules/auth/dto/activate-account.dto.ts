import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MinLength, IsNotEmpty } from 'class-validator';

export class ActivateAccountDto {
  @ApiProperty({ example: 'activation-token-123' })
  @IsNotEmpty({ message: 'El token de activación no debe estar vacío' })
  token: string;

  @ApiPropertyOptional({ example: 'StrongPass123!@#' })
  @IsOptional()
  @MinLength(8, { message: 'La contraseña debe tener al menos 8 caracteres' })
  password?: string;
}
