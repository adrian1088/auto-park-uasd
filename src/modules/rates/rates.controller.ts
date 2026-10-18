import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { CreateRateDto } from './dto/create-rate.dto';
import { UpdateRateDto } from './dto/update-rate.dto';
import { Rate } from './entities/rate.entity';
import { RateType } from './enum/rate-type.enum';
import { RatesService } from './rates.service';
import { ApiResponseType } from '../../shared/decorator/api-response-type.decorator';
import { FilterRateDto, FilterRatePaginatedDto, RateDto } from './dto/rate.dto';
import { ApiTags } from '@nestjs/swagger';
import { ResponsePaginatedDto } from '../../shared/dtos/response-paginated.dto';

@ApiTags('Rates')
@Controller('rates')
export class RatesController {
  constructor(private readonly ratesService: RatesService) {}

  @Post()
  @ApiResponseType(RateDto, {
    type: 'single',
  })
  async create(@Body() createRateDto: CreateRateDto): Promise<RateDto> {
    const rate = await this.ratesService.create(createRateDto);
    return RateDto.fromEntity(rate);
  }

  @Get('current/:parkingLotId/:type')
  async findCurrent(
    @Param('parkingLotId', ParseIntPipe) parkingLotId: number,
    @Param('type') type: RateType,
  ): Promise<RateDto> {
    const rate = await this.ratesService.findCurrent(parkingLotId, type);
    return RateDto.fromEntity(rate);
  }

  @Get()
  @ApiResponseType(RateDto, {
    type: 'array',
  })
  async findAll(
    @Query() filter: FilterRateDto,
    @Query('type') type?: RateType,
  ): Promise<RateDto[]> {
    const rates = await this.ratesService.findAll(
      filter.parkingLotId === undefined ? undefined : Number(filter.parkingLotId),
      type,
    );
    return RateDto.fromEntities(rates);
  }

  @Get('paginated')
  @ApiResponseType(RateDto, {
    type: 'paginated',
  })
  async findPaginated(
    @Query() filter: FilterRatePaginatedDto,
  ): Promise<ResponsePaginatedDto<RateDto>> {
    const { parkingLotId: rawParkingLotId, type, page, limit } = filter;
    const parkingLotId =
      rawParkingLotId === undefined ? undefined : Number(rawParkingLotId);
    const { data, total } = await this.ratesService.findPaginated(
      parkingLotId,
      type,
      page,
      limit,
    );
    return ResponsePaginatedDto.fromDataAndMeta({
      data: RateDto.fromEntities(data),
      total,
      page,
      limit,
    });
  }

  @Get(':id')
  @ApiResponseType(RateDto)
  async findOne(@Param('id', ParseIntPipe) id: number): Promise<RateDto> {
    const rate = await this.ratesService.findOne(id);
    return RateDto.fromEntity(rate);
  }

  @Patch(':id')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateRateDto: UpdateRateDto,
  ): Promise<RateDto> {
    const rate = await this.ratesService.update(id, updateRateDto);
    return RateDto.fromEntity(rate);
  }

  @Delete(':id')
  async remove(@Param('id', ParseIntPipe) id: number): Promise<void> {
    await this.ratesService.remove(id);
  }
}
