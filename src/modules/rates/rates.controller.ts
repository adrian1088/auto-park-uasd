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
import { RateDto } from './dto/rate.dto';

@Controller('rates')
export class RatesController {
  constructor(private readonly ratesService: RatesService) {}

  @Post()
  @ApiResponseType(RateDto, {
    type: 'single',
  })
  create(@Body() createRateDto: CreateRateDto): Promise<Rate> {
    return this.ratesService.create(createRateDto);
  }

  @Get('current/:parkingLotId/:type')
  findCurrent(
    @Param('parkingLotId', ParseIntPipe) parkingLotId: number,
    @Param('type') type: RateType,
  ): Promise<Rate> {
    return this.ratesService.findCurrent(parkingLotId, type);
  }

  @Get()
  findAll(
    @Query('parkingLotId') parkingLotId?: string,
    @Query('type') type?: RateType,
  ): Promise<Rate[]> {
    return this.ratesService.findAll(
      parkingLotId === undefined ? undefined : Number(parkingLotId),
      type,
    );
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number): Promise<Rate> {
    return this.ratesService.findOne(id);
  }

  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateRateDto: UpdateRateDto,
  ): Promise<Rate> {
    return this.ratesService.update(id, updateRateDto);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number): Promise<void> {
    return this.ratesService.remove(id);
  }
}