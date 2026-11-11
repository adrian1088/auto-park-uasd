import { ApiResponseProperty, IntersectionType } from '@nestjs/swagger';
import { PaginationDto } from '../../../shared/dtos/pagination.dto';

export class ReservationDto {
  @ApiResponseProperty({ type: Date })
  startTime: Date;

  @ApiResponseProperty({ type: Date })
  endTime: Date;

  @ApiResponseProperty({ type: Number })
  parkingSpaceId: number;

  @ApiResponseProperty({ type: String })
  vehiclePlateNumber?: string;

  static fromEntity(entity: any): ReservationDto {
    const dto = new ReservationDto();
    dto.startTime = entity.startTime;
    dto.endTime = entity.endTime;
    dto.parkingSpaceId = entity.parkingSpaceId;
    dto.vehiclePlateNumber = entity.vehiclePlateNumber;
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