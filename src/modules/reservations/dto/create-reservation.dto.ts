import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsDateString, IsInt, IsOptional, Min } from 'class-validator';

export class CreateReservationDto {
	@ApiProperty({ type: String, format: 'date-time' })
	@IsDateString()
	startTime: string;

	@ApiProperty({ type: String, format: 'date-time' })
	@IsDateString()
	endTime: string;

	@ApiProperty({ type: Number, minimum: 1 })
	@Type(() => Number)
	@IsInt()
	@Min(1)
	userId: number;

	@ApiProperty({ type: Number, minimum: 1 })
	@Type(() => Number)
	@IsInt()
	@Min(1)
	parkingSpaceId: number;

	@ApiPropertyOptional({ type: Number, minimum: 1, nullable: true })
	@IsOptional()
	@Type(() => Number)
	@IsInt()
	@Min(1)
	vehicleId?: number | null;
}
