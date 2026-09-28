import { ApiResponseProperty } from '@nestjs/swagger';

export class CheckoutQuoteDto {
  @ApiResponseProperty({ example: 42 })
  ticketId: number;

  @ApiResponseProperty({ type: Date })
  entranceAt: Date;

  @ApiResponseProperty({ type: Date })
  quotedAt: Date;

  @ApiResponseProperty({ example: 75 })
  elapsedMinutes: number;

  @ApiResponseProperty({ example: 2 })
  chargedHours: number;

  @ApiResponseProperty({ example: '100.00' })
  hourlyRate: string;

  @ApiResponseProperty({ example: '200.00' })
  amount: string;
}