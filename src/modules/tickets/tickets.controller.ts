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
import { CheckoutQuoteDto } from './dto/checkout-quote.dto';
import { TicketsService } from './tickets.service';
import { CheckInDto } from './dto/check-in.dto';
import { CheckOutDto } from './dto/check-out.dto';
import { ApiResponseType } from '../../shared/decorator/api-response-type.decorator';
import { ResponsePaginatedDto } from '../../shared/dtos/response-paginated.dto';
import {
  CurrentUser,
  CurrentUserType,
} from '../../shared/decorator/current-user.decorator';

@ApiTags('Tickets')
@Controller('tickets')
export class TicketsController {
  constructor(private readonly ticketsService: TicketsService) {}

  @Post('check-in')
  @ApiResponseType(TicketDto)
  async checkIn(
    @Body() dto: CheckInDto,
    @CurrentUser() user: CurrentUserType,
  ): Promise<TicketDto> {
    const result = await this.ticketsService.checkIn(dto, user);
    return TicketDto.fromEntity(result);
  }

  @Get(':id/checkout-quote')
  @ApiResponseType(CheckoutQuoteDto)
  async checkoutQuote(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<CheckoutQuoteDto> {
    const result = await this.ticketsService.checkoutQuote(id);
    return result;
  }

  @Post(':id/check-out')
  @ApiResponseType(TicketDto)
  async checkOut(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CheckOutDto,
  ): Promise<TicketDto> {
    const result = await this.ticketsService.checkOut(id, dto);
    return TicketDto.fromEntity(result);
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
  async findPaginated(
    @Query() filter: FilterTicketPaginatedDto,
  ): Promise<ResponsePaginatedDto<TicketDto>> {
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
