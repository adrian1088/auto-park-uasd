import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, Min, MinLength } from 'class-validator';

export class CheckInDto {
  @ApiPropertyOptional({
    type: String,
    minLength: 4,
    description: 'Matrícula del vehículo',
    example: 'A123456',
  })
  @IsOptional()
  @MinLength(4)
  plateNumber?: string;

  @ApiPropertyOptional({
    type: Number,
    minimum: 1,
    description: 'ID del estacionamiento',
    example: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  parkingLotId?: number; // este valor debe emviarlo en front end fijo

  @ApiPropertyOptional({
    type: Number,
    minimum: 1,
    description: 'ID de la reserva',
    example: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  reservationId?: number;
}