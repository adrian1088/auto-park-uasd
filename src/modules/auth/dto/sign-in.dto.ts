import { IsEmail, IsString } from "class-validator";

export class SignInDto {
    @IsEmail({}, { message: 'Invalid email address' })
    email: string;
    
    @IsString({ message: 'Password must be a string' })
    password: string;
}