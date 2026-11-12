import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsDateString,
  IsInt,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

export class CreateReservationDto {
	@ApiProperty({ type: String, format: 'date-time' })
	@IsDateString()
	startTime: string;

	@ApiProperty({ type: String, format: 'date-time' })
	@IsDateString()
	endTime: string;

  @ApiProperty({
    type: Number,
    minimum: 1,
    description: 'ID del espacio de estacionamiento',
  })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  parkingSpaceId: number;

  @ApiPropertyOptional({
    type: String,
    nullable: true,
    description: 'Número de placa del vehículo',
    example: 'A123456',
  })
  @IsOptional()
  @IsString()
  vehiclePlateNumber?: string | null;
}
