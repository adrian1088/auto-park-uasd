import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, Length } from 'class-validator';

export class RegisterDto {
  @ApiProperty({
    type: String,
    example: 'John Doe',
    description: 'User name',
  })
  @Length(3, 255, { message: 'El nombre debe tener entre 3 y 255 caracteres' })
  name: string;

  @ApiProperty({
    type: String,
    example: 'johndoe@example.com',
    description: 'User email address',
  })
  @IsEmail({}, { message: 'Correo electrónico inválido' })
  @Length(0, 255, {
    message: 'El correo electrónico no debe exceder los 255 caracteres',
  })
  email: string;

  @ApiProperty({
    type: String,
    example: 'P@ssw0rd',
    description: 'User password',
  })
  @Length(8, 255, {
    message: 'La contraseña debe tener entre 8 y 255 caracteres',
  })
  password: string;

  @ApiProperty({
    type: String,
    example: '1234567890',
    description: 'User phone number',
  })
  @Length(10, 50, {
    message: 'El número de teléfono debe tener entre 10 y 50 caracteres',
  })
  phone: string;
}
