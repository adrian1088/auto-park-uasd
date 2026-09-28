import { PartialType } from '@nestjs/swagger';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional } from 'class-validator';
import { CreateParkingSpaceDto } from './create-parking-space.dto';
import { ParkingSpaceStatus } from '../enum/parking-space-status.enum';

export class UpdateParkingSpaceDto extends PartialType(CreateParkingSpaceDto) {
	@ApiPropertyOptional({ enum: ParkingSpaceStatus })
	@IsOptional()
	@IsEnum(ParkingSpaceStatus)
	status?: ParkingSpaceStatus;
}