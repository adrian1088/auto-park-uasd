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
import { ApiTags } from '@nestjs/swagger';
import { CreateParkingFloorDto } from '../dto/create-parking-floor.dto';
import { UpdateParkingFloorDto } from '../dto/update-parking-floor.dto';
import { FloorsService } from './floors.service';

@ApiTags('Parking Floors')
@Controller('parking/floors')
export class FloorsController {
  constructor(private readonly floorsService: FloorsService) {}

  @Post()
  createFloor(@Body() dto: CreateParkingFloorDto) {
    return this.floorsService.createFloor(dto);
  }

  @Get()
  findAllFloors(@Query('parkingLotId') parkingLotId?: string) {
    return this.floorsService.findAllFloors(
      parkingLotId === undefined ? undefined : Number(parkingLotId),
    );
  }

  @Get(':id')
  findFloor(@Param('id', ParseIntPipe) id: number) {
    return this.floorsService.findFloor(id);
  }

  @Patch(':id')
  updateFloor(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateParkingFloorDto,
  ) {
    return this.floorsService.updateFloor(id, dto);
  }

  @Delete(':id')
  removeFloor(@Param('id', ParseIntPipe) id: number) {
    return this.floorsService.removeFloor(id);
  }
}
