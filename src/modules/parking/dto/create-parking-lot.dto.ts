import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsString, Length, Min } from 'class-validator';

export class CreateParkingLotDto {
  @ApiProperty({ example: 'Estacionamiento central', maxLength: 255 })
  @IsString()
  @Length(1, 255)
  name: string;

  @ApiProperty({ example: 'Av. Alma Mater, Santo Domingo', maxLength: 255 })
  @IsString()
  @Length(1, 255)
  address: string;

  @ApiProperty({ example: 120, minimum: 1 })
  @IsInt()
  @Min(1)
  capacity: number;
}