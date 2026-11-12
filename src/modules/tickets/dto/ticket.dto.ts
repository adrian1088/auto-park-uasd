import { ApiPropertyOptional, ApiResponseProperty, IntersectionType } from '@nestjs/swagger';
import { PaginationDto } from '../../../shared/dtos/pagination.dto';
import { TicketEntity } from '../entities/ticket.entity';
import { TicketEntity } from '../entities/ticket.entity';
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

  @ApiResponseProperty({
    type: 'string',
    example: 'A123456',
  })
  vehiclePlateNumber: string;

  static fromEntity(ticket: TicketEntity): TicketDto {
    const dto = new TicketDto();
    dto.id = ticket.id;
    dto.code = ticket.code;
    dto.plateNumber = ticket.vehiclePlateNumber; 
    dto.spotNumber = ticket.spot?.spaceNumber;
    dto.entranceAt = ticket.entranceAt;
    dto.exitAt = ticket.exitAt;
    dto.status = ticket.status;
    dto.rateAmount = Number(ticket.rateAmount);
    dto.vehiclePlateNumber = ticket.vehiclePlateNumber;
    return dto;
  }

  static fromEntities(tickets: TicketEntity[]): TicketDto[] {
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
