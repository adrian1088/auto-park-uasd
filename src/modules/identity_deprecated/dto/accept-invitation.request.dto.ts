import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';

export class AcceptInvitationRequestDto {
  @ApiProperty()
  @IsString()
  token!: string;

  @ApiProperty({ example: 'StrongPass123!@#' })
  @IsString()
  @MinLength(12)
  password!: string;
}
