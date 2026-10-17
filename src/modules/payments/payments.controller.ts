import {
  Body,
  Controller,
  Delete,
  Get,
  HttpStatus,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { PaymentsService } from './payments.service';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { UpdatePaymentDto } from './dto/update-payment.dto';
import { FindPaymentDto, FindPaymentPaginatedDto, PaymentDto } from './dto/payment.dto';
import { ApiResponseType } from '../../shared/decorator/api-response-type.decorator';
import { ResponsePaginatedDto } from '../../shared/dtos/response-paginated.dto';

@ApiTags('Payments')
@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post()
  @ApiResponseType(PaymentDto, {
    type: 'single',
    status: HttpStatus.CREATED,
  })
  create(@Body() createPaymentDto: CreatePaymentDto) {
    return this.paymentsService.create(createPaymentDto);
  }

  @Get()
  @ApiResponseType(PaymentDto, {
    type: 'array',
  })
  findAll(@Query() query: FindPaymentDto) {
    return this.paymentsService.findAll(query);
  }
  @Get('paginated')
  @ApiResponseType(PaymentDto, {
    type: 'paginated',
  })
  async findPaymentPaginated(
    @Query() query: FindPaymentPaginatedDto,
  ): Promise<ResponsePaginatedDto<PaymentDto>> {
    const { page, limit } = query;
    const { data, total } =
      await this.paymentsService.findPaymentPaginated(query);
    return ResponsePaginatedDto.fromDataAndMeta({
      data: PaymentDto.fromEntities(data),
      page,
      limit,
      total,
    });
  }

  @Get(':id')
  @ApiResponseType(PaymentDto, {
    type: 'single',
  })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.paymentsService.findOne(id);
  }

  @Patch(':id')
  @ApiResponseType(PaymentDto, {
    type: 'single',
  })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updatePaymentDto: UpdatePaymentDto,
  ) {
    return this.paymentsService.update(id, updatePaymentDto);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.paymentsService.remove(id);
  }
}
