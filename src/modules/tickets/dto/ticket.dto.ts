import {
  ApiPropertyOptional,
  ApiResponseProperty,
  IntersectionType,
} from '@nestjs/swagger';
import { PaginationDto } from '../../../shared/dtos/pagination.dto';
import { TicketStatus } from '../enum/ticket-status.enum';
import { IsOptional, IsString } from 'class-validator';

export class TicketSpaceDto {
  @ApiResponseProperty({ type: 'number', example: 6 })
  id: number;

  @ApiResponseProperty({ type: 'string', example: 'A-06' })
  spaceNumber: string;

  @ApiResponseProperty({ type: 'number', example: 1 })
  floorNumber?: number;
}

export class TicketDto {
  @ApiResponseProperty({
    type: 'number',
    example: 1,
  })
  id: number;

  @ApiResponseProperty({
    type: 'string',
    example: 'TCK-2024-123e4567-e89b-12d3-a456-426614174000',
  })
  code: string;

  @ApiResponseProperty({
    type: 'string',
    example: '2024-06-01T12:00:00Z',
  })
  entranceAt: Date;

  @ApiResponseProperty({
    type: 'string',
    example: '2024-06-01T14:00:00Z',
  })
  exitAt: Date | null;

  @ApiResponseProperty({
    enum: TicketStatus,
    example: TicketStatus.ACTIVE,
  })
  status: TicketStatus;

  @ApiResponseProperty({
    type: 'number',
    example: 50.0,
  })
  rateAmount: number;

  @ApiResponseProperty({
    type: 'string',
    example: 'A6SWWWZ2',
  })
  vehiclePlateNumber: string;

  @ApiResponseProperty({
    type: 'number',
    example: 12,
  })
  reservationId: number | null;

  @ApiResponseProperty({
    type: 'number',
    example: 6,
  })
  parkingSpaceId: number | null;

  @ApiResponseProperty({
    type: 'string',
    example: 'A-06',
  })
  spaceNumber: string | null;

  @ApiResponseProperty({
    type: TicketSpaceDto,
  })
  spot: TicketSpaceDto | null;

  static fromEntity(ticket: any): TicketDto {
    const dto = new TicketDto();
    dto.id = ticket.id;
    dto.code = ticket.code;
    dto.entranceAt = ticket.entranceAt;
    dto.exitAt = ticket.exitAt;
    dto.status = ticket.status;
    dto.rateAmount = Number(ticket.rateAmount);

    const resolvedReservationId =
      ticket.reservation?.id ??
      ticket.reservationId ??
      ticket.reservation_id ??
      null;
    dto.reservationId =
      resolvedReservationId !== null && resolvedReservationId !== undefined
        ? Number(resolvedReservationId)
        : null;

    const resolvedPlate =
      ticket.vehiclePlateNumber ??
      ticket.vehicle_plate_number ??
      ticket.vehicle?.plateNumber ??
      ticket.reservation?.vehiclePlateNumber ??
      ticket.reservation?.vehicle_plate_number ??
      '';

    dto.vehiclePlateNumber = String(resolvedPlate).trim().toUpperCase();

    const spaceEntity =
      ticket.spot ??
      ticket.parkingSpace ??
      ticket.reservation?.parkingSpace ??
      null;

    const resolvedSpaceId =
      spaceEntity?.id ??
      ticket.spotId ??
      ticket.parkingSpaceId ??
      ticket.parking_space_id ??
      ticket.reservation?.parkingSpaceId ??
      null;

    dto.parkingSpaceId =
      resolvedSpaceId !== null && resolvedSpaceId !== undefined
        ? Number(resolvedSpaceId)
        : null;

    dto.spaceNumber =
      spaceEntity?.spaceNumber ??
      spaceEntity?.space_number ??
      spaceEntity?.code ??
      (dto.parkingSpaceId !== null ? String(dto.parkingSpaceId) : null);

    dto.spot = spaceEntity
      ? {
          id: Number(spaceEntity.id ?? resolvedSpaceId),
          spaceNumber: String(
            spaceEntity.spaceNumber ??
              spaceEntity.space_number ??
              spaceEntity.code ??
              resolvedSpaceId ??
              '',
          ),
          floorNumber:
            spaceEntity.floor?.floorNumber ?? spaceEntity.floor?.floor_number,
        }
      : null;

    return dto;
  }

  static fromEntities(tickets: any[]): TicketDto[] {
    return tickets.map((ticket) => TicketDto.fromEntity(ticket));
  }
}

export class FilterTicketDto {
  @ApiPropertyOptional({ type: 'string' })
  @IsOptional()
  @IsString()
  code?: string;

  @ApiPropertyOptional({ type: 'string', format: 'date-time' })
  @IsOptional()
  fromDate?: Date;

  @ApiPropertyOptional({ type: 'string', format: 'date-time' })
  @IsOptional()
  toDate?: Date;

  @ApiPropertyOptional({ enum: TicketStatus })
  @IsOptional()
  status?: TicketStatus;
}

export class FilterTicketPaginatedDto extends IntersectionType(
  FilterTicketDto,
  PaginationDto,
) {}