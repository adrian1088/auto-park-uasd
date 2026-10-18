import { ApiProperty, ApiPropertyOptional, ApiResponseProperty, IntersectionType } from '@nestjs/swagger';
import { TicketDto } from '../../tickets/dto/ticket.dto';
import { PaymentMethod } from '../enum/payment-method.enum';
import { PaginationDto } from '../../../shared/dtos/pagination.dto';
import { Type } from 'class-transformer';
import { IsDateString, IsEnum, IsInt, IsOptional } from 'class-validator';

export class PaymentDto {
  @ApiResponseProperty({ type: 'number', example: 1 })
  id: number;

  @ApiResponseProperty({type: 'number', example: 100.0 })
  amount: number;

  @ApiResponseProperty({type: 'string', example: new Date() })
  date: Date;

  @ApiResponseProperty({ type: 'string', enum: PaymentMethod, example: PaymentMethod.CASH })
  method: PaymentMethod;

  @ApiResponseProperty({ type: TicketDto })
  ticket: TicketDto;

  static fromEntity(entity: any): PaymentDto {
    const dto = new PaymentDto();
    dto.id = entity.id;
    dto.amount = entity.amount;
    dto.date = entity.date;
    dto.method = entity.method;
    dto.ticket = TicketDto.fromEntity(entity.ticket);
    return dto;
  }

  static fromEntities(entities: any[]): PaymentDto[] {
    return entities.map(entity => PaymentDto.fromEntity(entity));
  }
}

export class FilterPaymentDto {
  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  ticketId?: number;

  @ApiPropertyOptional({ example: new Date() })
  @IsOptional()
  @Type(() => Date)
  @IsDateString()
  date?: Date;

  @ApiPropertyOptional({ enum: PaymentMethod, example: PaymentMethod.CASH })
  @IsOptional()
  @IsEnum(PaymentMethod)
  method?: PaymentMethod;
}

export class FilterPaymentPaginatedDto extends IntersectionType(
  FilterPaymentDto,
  PaginationDto,
) {}
 
