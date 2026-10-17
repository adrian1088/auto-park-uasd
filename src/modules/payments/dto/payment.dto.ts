import { ApiProperty, ApiPropertyOptional, ApiResponseProperty, IntersectionType } from '@nestjs/swagger';
import { PaymentMethod } from '../enum/payment-method.enum';
import { PaginationDto } from '../../../shared/dtos/pagination.dto';

export class PaymentDto {
  @ApiResponseProperty({ example: 100.0 })
  amount: number;

  @ApiResponseProperty({ example: new Date() })
  date: Date;

  @ApiResponseProperty({ enum: PaymentMethod, example: PaymentMethod.CASH })
  method: PaymentMethod;

  static fromEntity(entity: any): PaymentDto {
    const dto = new PaymentDto();
    dto.amount = entity.amount;
    dto.date = entity.date;
    dto.method = entity.method;
    return dto;
  }

  static fromEntities(entities: any[]): PaymentDto[] {
    return entities.map(entity => PaymentDto.fromEntity(entity));
  }
}

export class FindPaymentDto {
  @ApiPropertyOptional({ example: 1 })
  ticketId?: number;

  @ApiPropertyOptional({ example: 100.0 })
  amount?: number;

  @ApiPropertyOptional({ example: new Date() })
  date?: Date;

  @ApiPropertyOptional({ enum: PaymentMethod, example: PaymentMethod.CASH })
  method?: PaymentMethod;
}

export class FindPaymentPaginatedDto extends IntersectionType(
  FindPaymentDto,
  PaginationDto,
) {}
 
