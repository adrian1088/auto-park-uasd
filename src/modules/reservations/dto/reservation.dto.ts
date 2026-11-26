import { ApiResponseProperty, IntersectionType } from '@nestjs/swagger';
import { PaginationDto } from '../../../shared/dtos/pagination.dto';

export type ReservationComputedStatus = 'CONFIRMED' | 'EXPIRED' | 'PENDING';

export class ReservationDto {
  @ApiResponseProperty({ type: Number })
  id: number;

  @ApiResponseProperty({ type: Date })
  startTime: Date;

  @ApiResponseProperty({ type: Date })
  endTime: Date;

  @ApiResponseProperty({ type: Number })
  parkingSpaceId: number;

  @ApiResponseProperty({ type: String })
  vehiclePlateNumber?: string;

  @ApiResponseProperty({ type: String })
  qrCode?: string;

  @ApiResponseProperty({ type: Boolean })
  hasTicket: boolean;

  @ApiResponseProperty({
    type: String,
    enum: ['CONFIRMED', 'EXPIRED', 'PENDING'],
  })
  status: ReservationComputedStatus;

  static fromEntity(entity: any): ReservationDto {
    const dto = new ReservationDto();
    dto.id = entity.id;
    dto.startTime = entity.startTime;
    dto.endTime = entity.endTime;
    dto.parkingSpaceId = entity.parkingSpaceId;
    dto.vehiclePlateNumber = entity.vehiclePlateNumber;
    dto.qrCode = entity.qrCode;
    dto.hasTicket = Boolean(entity?.hasTicket);
    dto.status =
      entity?.status === 'CONFIRMED' ||
      entity?.status === 'EXPIRED' ||
      entity?.status === 'PENDING'
        ? entity.status
        : dto.hasTicket
          ? 'CONFIRMED'
          : 'PENDING';
    return dto;
  }

  static fromEntities(entities: any[]): ReservationDto[] {
    return entities.map((entity) => ReservationDto.fromEntity(entity));
  }
}

export class FilterRervationDto {}

export class FilterReservationPaginatedDto extends IntersectionType(
  FilterRervationDto,
  PaginationDto,
) {}