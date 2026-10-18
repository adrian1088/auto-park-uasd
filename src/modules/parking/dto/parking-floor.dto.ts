import {
  ApiProperty,
  ApiPropertyOptional,
  ApiResponseProperty,
  IntersectionType,
} from '@nestjs/swagger';
import { ParkingFloor } from '../entities/parking-floor.entity';
import { PaginationDto } from '../../../shared/dtos/pagination.dto';
import { ParkingLotDto } from './parking-lot.dto';
import { ParkingFloorStatus } from '../enum/parking-floor-status.enum';
import { ParkingSpaceDto } from './parking-space.dto';
import { IsInt, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';

export class ParkingFloorDto {
  @ApiResponseProperty({
    type: 'number',
    example: 1,
  })
  id: number;

  @ApiResponseProperty({
    type: 'number',
    example: 1,
  })
  floorNumber: number;

  @ApiResponseProperty({
    type: 'string',
    example: ParkingFloorStatus.OPEN,
  })
  status: ParkingFloorStatus;

  @ApiResponseProperty({
    type: 'number',
    example: 10,
  })
  totalSpaceCount: number;

  @ApiResponseProperty({
    type: ParkingLotDto,
  })
  lot: ParkingLotDto;

  @ApiResponseProperty({
    type: () => [ParkingSpaceDto],
  })
  spaces: ParkingSpaceDto[];

  static fromEntity(entity: ParkingFloor): ParkingFloorDto {
    if (!entity) {
      return null;
    }
    const dto = new ParkingFloorDto();
    dto.id = entity.id;
    dto.floorNumber = entity.floorNumber;
    dto.status = entity.status;
    dto.totalSpaceCount = entity.spaces?.length ?? 0;
    dto.lot = ParkingLotDto.fromEntity(entity.lot);
    dto.spaces =
      entity.spaces?.map((space) => ({ ...space, floor: undefined })) ?? [];
    return dto;
  }

  static fromEntities(entities: ParkingFloor[]): ParkingFloorDto[] {
    return entities.map((entity) => ParkingFloorDto.fromEntity(entity));
  }
}

export class FindParkingFloorsDto {
  @ApiPropertyOptional({
    type: 'number',
    example: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  lotId?: number;

  @ApiPropertyOptional({
    type: 'number',
    example: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  floorNumber?: number;
}

export class FindParkingFloorPaginatedDto extends IntersectionType(
  FindParkingFloorsDto,
  PaginationDto,
) {}
