import { ApiResponseProperty } from '@nestjs/swagger';

export class CheckInResponseDto {
  @ApiResponseProperty()
  ticketId: string;
}
