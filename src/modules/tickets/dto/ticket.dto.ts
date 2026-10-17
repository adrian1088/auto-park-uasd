import { ApiResponseProperty } from '@nestjs/swagger';
import { TicketStatus } from '../enum/ticket-status.enum';

export class TicketDto {
  @ApiResponseProperty({
    type: 'number',
    example: 1,
  })
  id: number;

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
    type: 'string',
    example: TicketStatus.ACTIVE,
  })
  status: TicketStatus;

  @ApiResponseProperty({
    type: 'number',
    example: 100,
  })
  amount: number;

  @ApiResponseProperty({
    type: 'string',
    example: '50.00',
  })
  rateAmount: string;

  @ApiResponseProperty({
    type: 'number',
    example: 1,
  })
  vehicleId: number;

  @ApiResponseProperty({
    type: 'number',
    example: 1,
  })
  userId: number;

  @ApiResponseProperty({
    type: 'number',
    example: 1,
  })
  spotId: number;

  @ApiResponseProperty({
    type: 'number',
    example: 1,
  })
  reservationId: number | null;

  @ApiResponseProperty({
    type: 'number',
    example: 1,
  })
  rateId: number;

  @ApiResponseProperty({
    type: 'number',
    example: 1,
  })
  paymentId: number | null;

  static fromEntity(ticket: any): TicketDto {
    const dto = new TicketDto();
    dto.id = ticket.id;
    dto.entranceAt = ticket.entranceAt;
    dto.exitAt = ticket.exitAt;
    dto.status = ticket.status;
    dto.amount = ticket.amount;
    dto.rateAmount = ticket.rateAmount;
    dto.vehicleId = ticket.vehicle?.id;
    dto.userId = ticket.user?.id;
    dto.spotId = ticket.spot?.id;
    dto.reservationId = ticket.reservation?.id ?? null;
    dto.rateId = ticket.rate?.id;
    dto.paymentId = ticket.payment?.id ?? null;
    return dto;
  }

  static fromEntities(tickets: any[]): TicketDto[] {
    return tickets.map((ticket) => TicketDto.fromEntity(ticket));
  }
}
