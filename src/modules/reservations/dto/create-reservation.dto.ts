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
	userId: number; //Recuerda que debes registrar tanto el id del que hace la reserva como la del cliente
                  //Tener en cuenta que el cliente puede estar registrado en la pagina y hacer el mismo su reserva,
                  //  o puede ser un cliente que no esta registrado y el que hace la reserva es un empleado del estacionamiento, en este caso el id del cliente sera null y se registrara el id del empleado que hace la reserva

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
  plateNumber?: string | null;


	@ApiPropertyOptional({ type: Number, minimum: 1, nullable: true })
	@IsOptional()
	@Type(() => Number)
	@IsInt()
	@Min(1)
	vehicleId?: number | null;
}
