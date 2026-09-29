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
import { CreateParkingFloorDto } from './dto/create-parking-floor.dto';
import { CreateParkingLotDto } from './dto/create-parking-lot.dto';
import { CreateParkingSpaceDto } from './dto/create-parking-space.dto';
import { UpdateParkingFloorDto } from './dto/update-parking-floor.dto';
import { UpdateParkingLotDto } from './dto/update-parking-lot.dto';
import { UpdateParkingSpaceDto } from './dto/update-parking-space.dto';
import { ParkingService } from './parking.service';
import { ApiResponseType } from '../../shared/decorator/api-response-type.decorator';
import { FindParkingLotsDto, ParkingLotDto } from './dto/parking-lot.dto';
import { ResponsePaginatedDto } from '../../shared/dtos/response-paginated.dto';

@ApiTags('Parking')
@Controller('parking')
export class ParkingController {
  constructor(private readonly parkingService: ParkingService) {}

  @Post('lots')
  @ApiResponseType(ParkingLotDto, {
    type: 'single',
    status: HttpStatus.CREATED,
  })
  createLot(@Body() dto: CreateParkingLotDto) {
    return this.parkingService.createLot(dto);
  }

  @Get('lots')
  @ApiResponseType(ParkingLotDto, { type: 'paginated' })
  async findAllLots(
    @Query() query: FindParkingLotsDto,
  ): Promise<ResponsePaginatedDto<ParkingLotDto>> {
    const { page, limit } = query;
    const lots = await this.parkingService.findAllLots(query);

    return ResponsePaginatedDto.fromDataAndMeta({
      data: ParkingLotDto.fromEntities(lots.data),
      total: lots.total,
      page,
      limit,
    });
  }

  @Get('lots/:id')
  @ApiResponseType(ParkingLotDto)
  async findLot(@Param('id', ParseIntPipe) id: number): Promise<ParkingLotDto> {
    const lot = await this.parkingService.findLot(id);
    return ParkingLotDto.fromEntity(lot);
  }

  @Patch('lots/:id')
  @ApiResponseType(ParkingLotDto)
  async updateLot(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateParkingLotDto,
  ): Promise<ParkingLotDto> {
    const lot = await this.parkingService.updateLot(id, dto);
    return ParkingLotDto.fromEntity(lot);
  }

  @Delete('lots/:id')
  removeLot(@Param('id', ParseIntPipe) id: number) {
    return this.parkingService.removeLot(id);
  }

  @Post('floors')
  createFloor(@Body() dto: CreateParkingFloorDto) {
    return this.parkingService.createFloor(dto);
  }

  @Get('floors')
  findAllFloors(@Query('parkingLotId') parkingLotId?: string) {
    return this.parkingService.findAllFloors(
      parkingLotId === undefined ? undefined : Number(parkingLotId),
    );
  }

  @Get('floors/:id')
  findFloor(@Param('id', ParseIntPipe) id: number) {
    return this.parkingService.findFloor(id);
  }

  @Patch('floors/:id')
  updateFloor(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateParkingFloorDto,
  ) {
    return this.parkingService.updateFloor(id, dto);
  }

  @Delete('floors/:id')
  removeFloor(@Param('id', ParseIntPipe) id: number) {
    return this.parkingService.removeFloor(id);
  }

  @Post('spaces')
  createSpace(@Body() dto: CreateParkingSpaceDto) {
    return this.parkingService.createSpace(dto);
  }

  @Get('spaces')
  findAllSpaces(@Query('floorId') floorId?: string) {
    return this.parkingService.findAllSpaces(
      floorId === undefined ? undefined : Number(floorId),
    );
  }

  @Get('spaces/:id')
  findSpace(@Param('id', ParseIntPipe) id: number) {
    return this.parkingService.findSpace(id);
  }

  @Patch('spaces/:id')
  updateSpace(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateParkingSpaceDto,
  ) {
    return this.parkingService.updateSpace(id, dto);
  }

  @Delete('spaces/:id')
  removeSpace(@Param('id', ParseIntPipe) id: number) {
    return this.parkingService.removeSpace(id);
  }
}
