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
import { ApiResponseType } from '../../../shared/decorator/api-response-type.decorator';
import { ResponsePaginatedDto } from '../../../shared/dtos/response-paginated.dto';
import { CreateParkingLotDto } from '../dto/create-parking-lot.dto';
import { FindParkingLotsDto, ParkingLotDto } from '../dto/parking-lot.dto';
import { UpdateParkingLotDto } from '../dto/update-parking-lot.dto';
import { LotsService } from './lots.service';

@ApiTags('Parking Lots')
@Controller('parking/lots')
export class LotsController {
  constructor(private readonly lotsService: LotsService) {}

  @Post()
  @ApiResponseType(ParkingLotDto, {
    type: 'single',
    status: HttpStatus.CREATED,
  })
  createLot(@Body() dto: CreateParkingLotDto) {
    return this.lotsService.createLot(dto);
  }

  @Get()
  @ApiResponseType(ParkingLotDto, { type: 'array' })
  async findAll(
  ): Promise<ParkingLotDto[]> {
    const lots = await this.lotsService.findAllLots();
    return ParkingLotDto.fromEntities(lots);
  }

  @Get('paginated')
  @ApiResponseType(ParkingLotDto, { type: 'paginated' })
  async findLotsPaginated(
    @Query() query: FindParkingLotsDto,
  ): Promise<ResponsePaginatedDto<ParkingLotDto>> {
    const { page, limit } = query;
    const lots = await this.lotsService.findLotsPaginated(query);

    return ResponsePaginatedDto.fromDataAndMeta({
      data: ParkingLotDto.fromEntities(lots.data),
      total: lots.total,
      page,
      limit,
    });
  }

  @Get(':id')
  @ApiResponseType(ParkingLotDto)
  async findLot(@Param('id', ParseIntPipe) id: number): Promise<ParkingLotDto> {
    const lot = await this.lotsService.findLot(id);
    return ParkingLotDto.fromEntity(lot);
  }

  @Patch(':id')
  @ApiResponseType(ParkingLotDto)
  async updateLot(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateParkingLotDto,
  ): Promise<ParkingLotDto> {
    const lot = await this.lotsService.updateLot(id, dto);
    return ParkingLotDto.fromEntity(lot);
  }

  @Delete(':id')
  removeLot(@Param('id', ParseIntPipe) id: number) {
    return this.lotsService.removeLot(id);
  }
}
