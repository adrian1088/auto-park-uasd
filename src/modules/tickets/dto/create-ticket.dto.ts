import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
	IsDateString,
	IsEnum,
	IsInt,
	IsNumber,
	IsOptional,
	Min,
} from 'class-validator';
import { RateType } from '../../rates/enum/rate-type.enum';
import { TicketStatus } from '../enum/ticket-status.enum';

export class CreateTicketDto {
	@ApiPropertyOptional({ type: String, format: 'date-time' })
	@IsOptional()
	@IsDateString()
	entranceAt?: string;

	@ApiPropertyOptional({ type: String, format: 'date-time', nullable: true })
	@IsOptional()
	@IsDateString()
	exitAt?: string | null;

	@ApiPropertyOptional({ enum: TicketStatus, default: TicketStatus.ACTIVE })
	@IsOptional()
	@IsEnum(TicketStatus)
	status?: TicketStatus;

	@ApiProperty({ type: Number, minimum: 0, maximum: 99999999.99 })
	@Type(() => Number)
	@IsNumber({ maxDecimalPlaces: 2 })
	@Min(0)
	amount: number;

	@ApiProperty({ type: Number, minimum: 1 })
	@Type(() => Number)
	@IsInt()
	@Min(1)
	vehicleId: number;

	@ApiProperty({ type: Number, minimum: 1 })
	@Type(() => Number)
	@IsInt()
	@Min(1)
	userId: number;

	@ApiProperty({ type: Number, minimum: 1 })
	@Type(() => Number)
	@IsInt()
	@Min(1)
	spotId: number;

	@ApiPropertyOptional({ type: Number, minimum: 1, nullable: true })
	@IsOptional()
	@Type(() => Number)
	@IsInt()
	@Min(1)
	reservationId?: number | null;

	@ApiPropertyOptional({ type: Number, minimum: 1, nullable: true })
	@IsOptional()
	@Type(() => Number)
	@IsInt()
	@Min(1)
	rateId?: number | null;
}
