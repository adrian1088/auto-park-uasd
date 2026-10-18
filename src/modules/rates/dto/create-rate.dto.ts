import {
  IsDate,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  Min,
} from 'class-validator';
import { RateType } from '../enum/rate-type.enum';
import { ApiProperty, ApiPropertyOptional,  } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';

export class CreateRateDto {
  @ApiProperty({ description: 'ID del estacionamiento' })
  @Type(() => Number)
  @IsInt({ message: 'ID del estacionamiento debe ser un número entero.' })
  @Min(1, { message: 'ID del estacionamiento debe ser como mínimo 1.' })
  parkingLotId: number;

  @ApiProperty({ enum: RateType, description: 'Tipo de tarifa' })
  @IsEnum(RateType, { message: 'Tipo de tarifa inválido.' })
  type: RateType;

  @ApiProperty({ type: 'number', minimum: 0.01, maximum: 999999.99 })
  @Type(() => Number)
  @IsNumber(
    { maxDecimalPlaces: 2 },
    { message: 'Monto debe tener como máximo 2 decimales.' },
  )
  @Min(0.01, { message: 'Monto debe ser como mínimo 0.01.' })
  amount: number;

  @ApiProperty({
    type: 'string',
    format: 'date-time',
    description: 'Fecha y hora de inicio de la validez de la tarifa',
  })
  @IsDate({
    message: 'Fecha y hora de inicio de la validez de la tarifa inválida.',
  })
  @Transform(({ value }) => new Date(value))
  validFrom: Date;

  @ApiPropertyOptional({
    type: 'string',
    format: 'date-time',
    required: false,
    description: 'Fecha y hora de fin de la validez de la tarifa',
  })
  @IsDate({
    message: 'Fecha y hora de fin de la validez de la tarifa inválida.',
  })
  @Transform(({ value }) => (value ? new Date(value) : undefined))
  @IsOptional()
  validTo?: Date;
}
