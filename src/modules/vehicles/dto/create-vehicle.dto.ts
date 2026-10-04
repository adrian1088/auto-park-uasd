import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
	IsEnum,
	IsInt,
	IsOptional,
	IsString,
	Length,
	Min,
} from 'class-validator';
import { VehicleType } from '../enum/vihicle-type.enum';

export class CreateVehicleDto {
	@ApiProperty({ example: 'A-1234', maxLength: 20 })
	@IsString()
	@Length(1, 20)
	plateNumber: string;

	@ApiProperty({ example: 'Toyota', maxLength: 255 })
	@IsString()
	@Length(1, 255)
	make: string;

	@ApiProperty({ example: 'Corolla', maxLength: 255 })
	@IsString()
	@Length(1, 255)
	model: string;

	@ApiProperty({ example: 'Azul', maxLength: 30 })
	@IsString()
	@Length(1, 30)
	color: string;

	@ApiProperty({ enum: VehicleType })
	@IsEnum(VehicleType)
	type: VehicleType;

	@ApiProperty({ example: 'Ana Pérez', maxLength: 255 })
	@IsString()
	@Length(1, 255)
	ownerName: string;

	@ApiPropertyOptional({ type: Number, minimum: 1, nullable: true })
	@IsOptional()
	@Type(() => Number)
	@IsInt()
	@Min(1)
	userId?: number | null;
}
