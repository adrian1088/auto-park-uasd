import { ApiProperty } from '@nestjs/swagger';
import { IsEmail } from 'class-validator';

export class ForgotPasswordDto {
  @ApiProperty({
    description:
      'Email del usuario que solicita el restablecimiento de contraseña',
    example: 'usuario@example.com',
  })
  @IsEmail({}, { message: 'Correo electrónico inválido' })
  email: string;
}
