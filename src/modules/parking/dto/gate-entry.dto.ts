import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsString, Length, Min } from 'class-validator';

export enum EntrySource {
  AUTOMATIC_LPR = 'AUTOMATIC_LPR',
  MANUAL = 'MANUAL',
}

export class GateEntryDto {
  @ApiProperty({ example: 'A-892-XYZ', description: 'Número de placa leída por la cámara LPR o ingresada manualmente' })
  @IsString()
  @Length(1, 20)
  plateNumber: string;

  @ApiProperty({ enum: EntrySource, example: EntrySource.AUTOMATIC_LPR, description: 'Origen del registro de entrada' })
  @IsEnum(EntrySource)
  source: EntrySource;

  @ApiPropertyOptional({ example: 'CAR', description: 'Tipo de vehículo requerido si es registro manual y no existe' })
  @IsOptional()
  @IsString()
  vehicleType?: string;

  @ApiPropertyOptional({ type: Number, minimum: 1, example: 1, description: 'ID del lote/estacionamiento del tótem' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  parkingLotId?: number;
}