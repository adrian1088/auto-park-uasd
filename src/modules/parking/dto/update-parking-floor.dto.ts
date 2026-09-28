import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, Min } from 'class-validator';

export class UpdateParkingFloorDto {
	@ApiPropertyOptional({ type: Number, minimum: 1 })
	@IsOptional()
	@Type(() => Number)
	@IsInt()
	@Min(1)
	parkingLotId?: number;

	@ApiPropertyOptional({ type: Number })
	@IsOptional()
	@Type(() => Number)
	@IsInt()
	floorNumber?: number;
}