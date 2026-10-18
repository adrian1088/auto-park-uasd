import {
  ApiProperty,
  ApiPropertyOptional,
  ApiResponseProperty,
  IntersectionType,
} from '@nestjs/swagger';
import { PaginationDto } from '../../../shared/dtos/pagination.dto';
import { ParkingSpaceType } from '../enum/parking-space-type.enum';
import { ParkingSpaceStatus } from '../enum/parking-space-status.enum';
import { ParkingFloorDto } from './parking-floor.dto';
import { IsInt, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';

export class ParkingSpaceDto {
  @ApiResponseProperty({
    type: 'number',
    example: 1,
  })
  id: number;

  @ApiResponseProperty({
    type: 'string',
    example: 'A-01',
  })
  spaceNumber: string;

  @ApiResponseProperty({
    type: 'string',
    example: ParkingSpaceType.CAR,
  })
  type: ParkingSpaceType;

  @ApiResponseProperty({
    type: 'string',
    example: ParkingSpaceStatus.FREE,
  })
  status: ParkingSpaceStatus;

  @ApiResponseProperty({
    type: () => ParkingFloorDto,
  })
  floor: Omit<ParkingFloorDto, 'spaces'>;

  static fromEntity(entity: any): ParkingSpaceDto {
    const dto = new ParkingSpaceDto();
    dto.id = entity.id;
    dto.spaceNumber = entity.spaceNumber;
    dto.type = entity.type;
    dto.status = entity.status;
    if (entity.floor) {
      const { spaces, ...floor } = ParkingFloorDto.fromEntity({
        ...entity.floor,
        spaces: undefined,
      });
      dto.floor = floor;
    }
    return dto;
  }

  static fromEntities(entities: any[]): ParkingSpaceDto[] {
    return entities.map((entity) => ParkingSpaceDto.fromEntity(entity));
  }
}

export class FindParkingSpacesDto {
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
  floorId?: number;
}

export class FindParkingSpacesPaginatedDto extends IntersectionType(
  FindParkingSpacesDto,
  PaginationDto,
) {}
