import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsDateString,
  IsEmail,
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

  @ApiPropertyOptional({
    type: String,
    description: 'Nombre del cliente (uso de personal/admin)',
    example: 'Juan Pérez',
  })
  @IsOptional()
  @IsString()
  clientName?: string;

  @ApiPropertyOptional({
    type: String,
    description: 'Correo del cliente (uso de personal/admin)',
    example: 'cliente@correo.com',
  })
  @IsOptional()
  @IsEmail()
  clientEmail?: string;

  @ApiPropertyOptional({
    type: String,
    description: 'Teléfono del cliente (uso de personal/admin)',
    example: '8095551234',
  })
  @IsOptional()
  @IsString()
  clientPhone?: string;

  @ApiPropertyOptional({
    type: Number,
    minimum: 1,
    description: 'ID de usuario existente (uso de personal/admin)',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  userId?: number;
}