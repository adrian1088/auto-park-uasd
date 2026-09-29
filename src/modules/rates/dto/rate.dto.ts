import { Rate } from "../entities/rate.entity";
import { RateType } from "../enum/rate-type.enum";

export class RateDto {
  id: number;
  amount: number;
  validFrom: Date;
  validTo: Date;
  isActive: boolean;
  parkingLotId: number;
  type: RateType;

  static fromEntity(entity: Rate): RateDto {
    const dto = new RateDto();
    dto.id = entity.id;
    dto.amount = entity.amount;
    dto.validFrom = entity.validFrom;
    dto.validTo = entity.validTo;
    dto.isActive = entity.isActive;
    dto.parkingLotId = entity.parkingLot.id;
    dto.type = entity.type;
    return dto;
  }
}
