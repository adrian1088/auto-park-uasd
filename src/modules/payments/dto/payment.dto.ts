import { ApiPropertyOptional, ApiResponseProperty, IntersectionType } from '@nestjs/swagger';
import { TicketDto } from '../../tickets/dto/ticket.dto';
import { PaymentMethod } from '../enum/payment-method.enum';
import { PaginationDto } from '../../../shared/dtos/pagination.dto';
import { Type } from 'class-transformer';
import { IsDateString, IsEnum, IsInt, IsOptional } from 'class-validator';

export class PaymentDto {
  @ApiResponseProperty({ type: 'number', example: 1 })
  id: number;

  @ApiResponseProperty({ type: 'number', example: 100.0 })
  amount: number;

  @ApiResponseProperty({ type: 'string', example: new Date() })
  date: Date;

  @ApiResponseProperty({ type: 'string', enum: PaymentMethod, example: PaymentMethod.CASH })
  method: PaymentMethod;

  @ApiResponseProperty({ type: TicketDto })
  ticket: TicketDto | null; // Permite null para pagos de suscripción

  @ApiResponseProperty({ type: 'number', example: 1 })
  userId: number | null; // 🚀 ID del usuario/abonado asociado al pago

  @ApiResponseProperty({ example: { id: 1, name: 'Usuario', email: 'correo@example.com' } })
  user: any | null; // 🚀 Datos públicos del usuario asociado al pago

  static fromEntity(entity: any): PaymentDto {
    const dto = new PaymentDto();
    dto.id = entity.id;
    dto.amount = Number(entity.amount);
    dto.date = entity.paymentDate || entity.date;
    dto.method = entity.paymentMethod || entity.method;
    
    // Valida si existe el ticket antes de transformarlo para evitar errores
    dto.ticket = entity.ticket ? TicketDto.fromEntity(entity.ticket) : null;

    // 🚀 Extraemos de forma segura el userId y los datos del usuario sin exponer la contraseña
    dto.userId = entity.user?.id || entity.user_id || null;
    if (entity.user) {
      const { password: _password, ...publicUser } = entity.user;
      dto.user = publicUser;
    } else {
      dto.user = null;
    }

    return dto;
  }

  static fromEntities(entities: any[]): PaymentDto[] {
    return entities.map((entity) => PaymentDto.fromEntity(entity));
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