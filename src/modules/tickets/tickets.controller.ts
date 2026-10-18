import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Query,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import {
  FilterTicketDto,
  FilterTicketPaginatedDto,
  TicketDto,
} from './dto/ticket.dto';
import { TicketsService } from './tickets.service';
import { CheckInDto } from './dto/check-in.dto';
import { CheckOutDto } from './dto/check-out.dto';
import { ApiResponseType } from '../../shared/decorator/api-response-type.decorator';
import { ResponsePaginatedDto } from '../../shared/dtos/response-paginated.dto';

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
  @ApiResponseType(TicketDto, {
    type: 'array',
  })
  async findAll(@Query() filter: FilterTicketDto) {
    const tickets = await this.ticketsService.findAll(filter);

    return TicketDto.fromEntities(tickets);
  }

  @Get('paginated')
  @ApiResponseType(TicketDto, {
    type: 'paginated',
  })
  async findPaginated(@Query() filter: FilterTicketPaginatedDto) {
    const { page, limit } = filter;
    const { data, total } = await this.ticketsService.findPaginated(filter);
    return ResponsePaginatedDto.fromDataAndMeta({
      data: TicketDto.fromEntities(data),
      total,
      page,
      limit,
    });
  }

  @Get(':id')
  @ApiResponseType(TicketDto)
  async findOne(@Param('id', ParseIntPipe) id: number) {
    const ticket = await this.ticketsService.findOne(id);
    return TicketDto.fromEntity(ticket);
  }
}
