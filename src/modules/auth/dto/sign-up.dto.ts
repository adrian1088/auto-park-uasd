import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString } from 'class-validator';

export class SignUpDto {
  @ApiProperty({
    type: String,
    example: 'John Doe',
    description: 'User name',
  })
  @IsNotEmpty({ message: 'Nombre no debe estar vacío' })
  name: string;

  @ApiProperty({
    type: String,
    example: 'johndoe@example.com',
    description: 'User email address',
  })
  @IsEmail({}, { message: 'Correo electrónico inválido' })
  @IsNotEmpty({ message: 'Correo electrónico no debe estar vacío' })
  email: string;

  @ApiProperty({
    type: String,
    example: 'P@ssw0rd',
    description: 'User password',
  })
  @IsNotEmpty({ message: 'Contraseña no debe estar vacío' })
  password: string;

  @ApiProperty({
    type: String,
    example: '1234567890',
    description: 'User phone number',
  })
  @IsNotEmpty({ message: 'Número de teléfono no debe estar vacío' })
  phone: string;
}
