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
import { SubscriptionsService } from './subscriptions.service';
import { CreateSubscriptionDto } from './dto/create-subscription.dto';
import { UpdateSubscriptionDto } from './dto/update-subscription.dto';
import {
  FilterSubscriptionPaginatedDto,
  SubscriptionDto,
} from './dto/subscription.dto';
import { ApiResponseType } from '../../shared/decorator/api-response-type.decorator';
import { ResponsePaginatedDto } from '../../shared/dtos/response-paginated.dto';
import {
  CurrentUser,
  CurrentUserType,
} from '../../shared/decorator/current-user.decorator';
import { PaymentMethod } from '../payments/enum/payment-method.enum';

@ApiTags('Subscriptions')
@Controller('subscriptions')
export class SubscriptionsController {
  constructor(private readonly subscriptionsService: SubscriptionsService) {}

  @Post()
  @ApiResponseType(SubscriptionDto, { status: HttpStatus.CREATED })
  async create(
    @Body() createDto: CreateSubscriptionDto,
  ): Promise<SubscriptionDto> {
    const sub = await this.subscriptionsService.create(createDto);
    return SubscriptionDto.fromEntity(sub);
  }

  @Get()
  @ApiResponseType(SubscriptionDto, { type: 'array' })
  async findAll(): Promise<SubscriptionDto[]> {
    const subs = await this.subscriptionsService.findAll();
    return SubscriptionDto.fromEntities(subs);
  }

  @Get('paginated')
  @ApiResponseType(SubscriptionDto, { type: 'paginated' })
  async findPaginated(
    @Query() filter: FilterSubscriptionPaginatedDto,
  ): Promise<ResponsePaginatedDto<SubscriptionDto>> {
    const { page, limit } = filter;
    const { data, total } =
      await this.subscriptionsService.findPaginated(filter);
    return ResponsePaginatedDto.fromDataAndMeta({
      data: SubscriptionDto.fromEntities(data),
      page,
      limit,
      total,
    });
  }

  @Get(':id')
  @ApiResponseType(SubscriptionDto)
  async findOne(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<SubscriptionDto> {
    const sub = await this.subscriptionsService.findOne(id);
    return SubscriptionDto.fromEntity(sub);
  }

  @Patch(':id')
  @ApiResponseType(SubscriptionDto)
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateDto: UpdateSubscriptionDto,
  ): Promise<SubscriptionDto> {
    const sub = await this.subscriptionsService.update(id, updateDto);
    return SubscriptionDto.fromEntity(sub);
  }

  @Post(':id/renew')
  @ApiResponseType(SubscriptionDto)
  async renew(
    @Param('id', ParseIntPipe) id: number,
    @Body() renewDto: { amount: number; paymentMethod: PaymentMethod },
    @CurrentUser() user: CurrentUserType,
  ): Promise<SubscriptionDto> {
    const sub = await this.subscriptionsService.renew(id, renewDto, user);
    return SubscriptionDto.fromEntity(sub);
  }

  @Delete(':id')
  @ApiResponseType(SubscriptionDto)
  async remove(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<SubscriptionDto> {
    const sub = await this.subscriptionsService.remove(id);
    return SubscriptionDto.fromEntity(sub);
  }
}