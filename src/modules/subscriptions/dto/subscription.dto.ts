import { ApiResponseProperty, ApiPropertyOptional, IntersectionType } from '@nestjs/swagger';
import { Subscription } from '../entities/subscription.entity';
import { SubscriptionStatus } from '../enum/subscription-status.enum';
import { PaginationDto } from '../../../shared/dtos/pagination.dto';
import { IsEnum, IsOptional, IsString } from 'class-validator';

export class SubscriptionDto {
  @ApiResponseProperty({ example: 1 })
  id: number;

  @ApiPropertyOptional({ example: 'A123456, B987654' })
  plateNumbers: string | null;

  @ApiResponseProperty({ example: 'SUB-QR-uuid-token-string' })
  qrCode: string;

  @ApiResponseProperty({ example: false })
  emailSent: boolean;

  @ApiResponseProperty({ type: Date })
  startDate: Date;

  @ApiResponseProperty({ type: Date })
  endDate: Date;

  @ApiResponseProperty({ enum: SubscriptionStatus })
  status: SubscriptionStatus;

  @ApiResponseProperty({ example: { id: 1, name: 'Usuario' } })
  user: any;

  @ApiResponseProperty({ example: { id: 1, amount: 3000 } })
  rate: any;

  @ApiResponseProperty({ example: { id: 1, spaceNumber: 'A-101' } })
  parkingSpace: any;

  static fromEntity(entity: Subscription): SubscriptionDto {
    const dto = new SubscriptionDto();
    dto.id = entity.id;
    dto.plateNumbers = entity.plateNumbers;
    dto.qrCode = entity.qrCode;
    dto.emailSent = entity.emailSent;
    dto.startDate = entity.startDate;
    dto.endDate = entity.endDate;
    dto.status = entity.status;
    dto.user = entity.user;
    dto.rate = entity.rate;
    dto.parkingSpace = entity.parkingSpace; 
    return dto;
  }

  static fromEntities(entities: Subscription[]): SubscriptionDto[] {
    return entities.map((entity) => SubscriptionDto.fromEntity(entity));
  }
}

export class FilterSubscriptionDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ enum: SubscriptionStatus })
  @IsOptional()
  @IsEnum(SubscriptionStatus)
  status?: SubscriptionStatus;
}

export class FilterSubscriptionPaginatedDto extends IntersectionType(
  FilterSubscriptionDto,
  PaginationDto,
) {}