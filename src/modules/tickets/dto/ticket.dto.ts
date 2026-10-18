import { ApiPropertyOptional, ApiResponseProperty, IntersectionType } from '@nestjs/swagger';
import { PaginationDto } from '../../../shared/dtos/pagination.dto';
import { Ticket } from '../entities/ticket.entity';
import { TicketStatus } from '../enum/ticket-status.enum';
import { IsOptional, IsString } from 'class-validator';

export class TicketDto {
  @ApiResponseProperty({
    type: 'number',
    example: 1,
  })
  id: number;

  @ApiResponseProperty({
    type: 'string',
    example: 'TCK-2024-123e4567-e89b-12d3-a456-426614174000',
  })
  code: string;

  @ApiResponseProperty({
    type: 'string',
    example: '2024-06-01T12:00:00Z',
  })
  entranceAt: Date;
  @ApiResponseProperty({
    type: 'string',
    example: '2024-06-01T14:00:00Z',
  })
  exitAt: Date | null;

  @ApiResponseProperty({
    enum: TicketStatus,
    example: TicketStatus.ACTIVE,
  })
  status: TicketStatus;

  @ApiResponseProperty({
    type: 'number',
    example: 50.00,
  })
  rateAmount: number;

  // TODO: validar mas adelante
  // @ApiResponseProperty({
  //   type: 'number',
  //   example: 1,
  // })
  // vehicleId: number;

  // @ApiResponseProperty({
  //   type: 'number',
  //   example: 1,
  // })
  // userId: number;

  // @ApiResponseProperty({
  //   type: 'number',
  //   example: 1,
  // })
  // spotId: number;

  // @ApiResponseProperty({
  //   type: 'number',
  //   example: 1,
  // })
  // reservationId: number | null;

  // @ApiResponseProperty({
  //   type: 'number',
  //   example: 1,
  // })
  // rateId: number;


  static fromEntity(ticket: Ticket): TicketDto {
    const dto = new TicketDto();
    dto.id = ticket.id;
    dto.code = ticket.code;
    dto.entranceAt = ticket.entranceAt;
    dto.exitAt = ticket.exitAt;
    dto.status = ticket.status;
    dto.rateAmount = Number(ticket.rateAmount);
    // dto.vehicleId = ticket.vehicle?.id;
    // dto.userId = ticket.user?.id;
    // dto.spotId = ticket.spot?.id;
    // dto.reservationId = ticket.reservation?.id ?? null;
    // dto.rateId = ticket.rate?.id;
    return dto;
  }

  static fromEntities(tickets: Ticket[]): TicketDto[] {
    return tickets.map((ticket) => TicketDto.fromEntity(ticket));
  }
}

export class FilterTicketDto {
  @ApiPropertyOptional({ type: 'string' })
  @IsOptional()
  @IsString()
  code?: string;

  @ApiPropertyOptional({ type: 'string', format: 'date-time' })
  @IsOptional()
  fromDate?: Date;

  @ApiPropertyOptional({ type: 'string', format: 'date-time' })
  @IsOptional()
  toDate?: Date;
  
  @ApiPropertyOptional({ enum: TicketStatus })
  @IsOptional()
  status?: TicketStatus;
}

export class FilterTicketPaginatedDto  extends IntersectionType(FilterTicketDto, PaginationDto) {}
