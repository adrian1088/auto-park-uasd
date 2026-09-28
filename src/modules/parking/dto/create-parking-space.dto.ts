import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsString, Length, Min } from 'class-validator';
import { ParkingSpaceType } from '../enum/parking-space-type.enum';

export class CreateParkingSpaceDto {
  @ApiProperty({ example: 'A-01', maxLength: 10 })
  @IsString()
  @Length(1, 10)
  spaceNumber: string;

  @ApiProperty({ enum: ParkingSpaceType })
  @IsEnum(ParkingSpaceType)
  type: ParkingSpaceType;
  @ApiProperty({ type: Number, minimum: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  floorId: number;
}