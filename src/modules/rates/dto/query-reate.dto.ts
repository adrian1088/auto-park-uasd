import { ApiProperty } from '@nestjs/swagger';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { RateType } from '../enum/rate-type.enum';
import { IsEnum, IsNumber, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';
export class QueryRateDto {
  @ApiPropertyOptional({ description: 'ID del estacionamiento' })
  @Type(() => Number)
  @IsNumber()
  @IsOptional()
  parkingLotId?: number;

  @ApiPropertyOptional({
    enum: RateType,
    description: 'Tipo de tarifa',
  })
  @IsEnum(RateType)
  @IsOptional()
  type?: RateType;

  @ApiProperty({ example: 1, description: 'Número de página' })
  @IsNumber()
  @Type(() => Number)
  page: number;

  @ApiProperty({
    example: 10,
    description: 'Cantidad de elementos por página',
  })
  @IsNumber()
  @Type(() => Number)
  limit: number;
}
