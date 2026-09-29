import { ApiResponseProperty } from "@nestjs/swagger";
import { PaginationDto } from "../../../shared/dtos/pagination.dto";
import { ParkingLot } from "../entities/parking-lot.entity";

export class ParkingLotDto {
  @ApiResponseProperty({
    type: 'number',
    example: 1,
  })
  id: number;

  @ApiResponseProperty({
    type: 'string',
    example: 'Main Street Parking',
  })
  name: string;

  @ApiResponseProperty({
    type: 'string',
    example: '123 Main St, City, Country',
  })
  address: string;

  @ApiResponseProperty({
    type: 'number',
    example: 50,
  })
  capacity: number;

  @ApiResponseProperty({
    type: 'number',
    example: 10,
  })
  
  static fromEntity(entity: ParkingLot): ParkingLotDto {
    const dto = new ParkingLotDto();
    dto.id = entity.id;
    dto.name = entity.name;
    dto.address = entity.address;
    dto.capacity = entity.capacity;
    return dto;
  }

  static fromEntities(entities: ParkingLot[]): ParkingLotDto[] {
    return entities.map(entity => ParkingLotDto.fromEntity(entity));
  }
}

export class FindParkingLotsDto extends PaginationDto {}