import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { TicketsService } from './tickets.service';
import { CheckInDto } from './dto/check-in.dto';
import { CheckOutDto } from './dto/check-out.dto';

@ApiTags('Tickets')
@Controller('tickets')
export class TicketsController {
  constructor(private readonly ticketsService: TicketsService) {}

  @Post('check-in')
  checkIn(@Body() dto: CheckInDto) {
    return this.ticketsService.checkIn(dto);
  }

  @Get(':id/checkout-quote')
  checkoutQuote(@Param('id', ParseIntPipe) id: number) {
    return this.ticketsService.checkoutQuote(id);
  }

  @Post(':id/check-out')
  checkOut(@Param('id', ParseIntPipe) id: number, @Body() dto: CheckOutDto) {
    return this.ticketsService.checkOut(id, dto);
  }

  @Get()
  findAll() {
    return this.ticketsService.findAll();
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.ticketsService.findOne(id);
  }

}
