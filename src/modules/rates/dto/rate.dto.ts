import { ApiResponseProperty } from "@nestjs/swagger";
import { Rate } from "../entities/rate.entity";
import { RateType } from "../enum/rate-type.enum";

export class RateDto {
  @ApiResponseProperty({ type: Number, example: 1 })
  id: number;

  @ApiResponseProperty({ type: Number, example: 100 })
  amount: number;

  @ApiResponseProperty({ type: Date, example: "2024-01-01T00:00:00.000Z" })
  validFrom: Date;

  @ApiResponseProperty({ type: Date, example: "2024-12-31T23:59:59.000Z" })
  validTo: Date;

  @ApiResponseProperty({ type: Boolean, example: true })
  isActive: boolean;

  @ApiResponseProperty({ enum: RateType, example: RateType.HOURLY })
  type: RateType;
  

  @ApiResponseProperty({ type: Object, example: { id: 1, name: "Main Parking Lot" } })
  parkingLot: { id: number; name: string };

  static fromEntity(entity: Rate): RateDto {
    const dto = new RateDto();
    dto.id = entity.id;
    dto.amount = entity.amount;
    dto.validFrom = entity.validFrom;
    dto.validTo = entity.validTo;
    dto.isActive = entity.isActive;
    dto.parkingLot = { id: entity.parkingLot.id, name: entity.parkingLot.name  };
    dto.type = entity.type;
    return dto;
  }

  static fromEntities(entities: Rate[]): RateDto[] {
    return entities.map(entity => RateDto.fromEntity(entity));
  }
}
