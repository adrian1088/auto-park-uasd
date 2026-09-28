import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, Min } from 'class-validator';

export class CreateParkingFloorDto {
  @ApiProperty({ type: Number, minimum: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  parkingLotId: number;

  @ApiProperty({ type: Number, example: 1 })
  @Type(() => Number)
  @IsInt()
  floorNumber: number;
}