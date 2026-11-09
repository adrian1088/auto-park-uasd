import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsInt, IsString, Max, Min } from 'class-validator';

export class CreateInvitationRequestDto {
  @ApiProperty({ example: 'Ana' })
  @IsString({ message: 'El nombre debe ser una cadena de texto' })
  name: string;

  @ApiProperty({ example: 'ana@example.com' })
  @IsEmail({}, { message: 'Debe ser un correo electrónico válido' })
  email: string;

  @ApiProperty({
    example: '+1234567890',
    description: 'Phone number of the invitee',
  })
  @IsString({ message: 'El teléfono debe ser una cadena de texto' })
  phone: string;

  @ApiProperty({ example: 24 })
  @IsInt({ message: 'ttlHours Debe ser un número entero' })
  @Min(1, { message: 'ttlHours debe ser al menos 1' })
  @Max(24, { message: 'ttlHours no puede ser mayor a 24' })
  ttlHours: number;
}
