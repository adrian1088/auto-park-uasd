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
import {
  FilterPaymentDto,
  FilterPaymentPaginatedDto,
  PaymentDto,
} from './dto/payment.dto';
import { ApiResponseType } from '../../shared/decorator/api-response-type.decorator';
import { ResponsePaginatedDto } from '../../shared/dtos/response-paginated.dto';
import {
  CurrentUser,
  CurrentUserType,
} from '../../shared/decorator/current-user.decorator';

@ApiTags('Payments')
@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post()
  @ApiResponseType(PaymentDto, {
    type: 'single',
    status: HttpStatus.CREATED,
  })
  create(
    @Body() createPaymentDto: CreatePaymentDto,
    @CurrentUser() user: CurrentUserType,
  ) {
    return this.paymentsService.create(createPaymentDto, user);
  }

  @Get()
  @ApiResponseType(PaymentDto, {
    type: 'array',
  })
  findAll(@Query() filter: FilterPaymentDto) {
    return this.paymentsService.findAll(filter);
  }

  @Get('paginated')
  @ApiResponseType(PaymentDto, {
    type: 'paginated',
  })
  async findPaymentPaginated(
    @Query() filter: FilterPaymentPaginatedDto,
  ): Promise<ResponsePaginatedDto<PaymentDto>> {
    const { page, limit } = filter;
    const { data, total } =
      await this.paymentsService.findPaymentPaginated(filter);
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
    @CurrentUser() user: CurrentUserType,
  ) {
    return this.paymentsService.update(id, updatePaymentDto, user);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.paymentsService.remove(id);
  }
}
