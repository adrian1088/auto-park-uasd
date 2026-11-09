import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, MaxLength } from 'class-validator';

export class LoginDto {
  @ApiProperty({
    type: String,
    example: 'johndoe@example.com',
    description: 'The email address of the user',
  })
  @IsEmail({}, { message: 'Correo electrónico inválido' })
  email: string;

  @ApiProperty({
    type: String,
    example: 'P@ssw0rd',
    description: 'The password of the user',
  })
  @IsString({ message: 'Contraseña debe ser una cadena de texto' })
  @MaxLength(255, { message: 'La contraseña no debe exceder los 255 caracteres' })
  password: string;
}
