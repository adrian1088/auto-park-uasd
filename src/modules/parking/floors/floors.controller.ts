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
import { CreateParkingFloorDto } from '../dto/create-parking-floor.dto';
import { UpdateParkingFloorDto } from '../dto/update-parking-floor.dto';
import { FloorsService } from './floors.service';
import { FindParkingFloorsDto, FindParkingFloorPaginatedDto, ParkingFloorDto } from '../dto/parking-floor.dto';
import { ResponsePaginatedDto } from '../../../shared/dtos/response-paginated.dto';
import { ApiResponseType } from '../../../shared/decorator/api-response-type.decorator';

@ApiTags('Parking Floors')
@Controller('parking/floors')
export class FloorsController {
  constructor(private readonly floorsService: FloorsService) {}

  @Post()
  @ApiResponseType(ParkingFloorDto, {
    type: 'single',
    status: HttpStatus.CREATED,
  })
  async createFloor(@Body() dto: CreateParkingFloorDto) {
    const floor = await this.floorsService.createFloor(dto);
    return ParkingFloorDto.fromEntity(floor);
  }

  @Get()
  @ApiResponseType(ParkingFloorDto, { type: 'array' })
  async findAllFloors(@Query() query: FindParkingFloorsDto) {
    const floors = await this.floorsService.findAllFloors(query);
    return ParkingFloorDto.fromEntities(floors);
  }

  @Get('paginated')
  @ApiResponseType(ParkingFloorDto, { type: 'paginated' })
  async findFloorsPaginated(
    @Query() query: FindParkingFloorPaginatedDto,
  ): Promise<ResponsePaginatedDto<ParkingFloorDto>> {
    const { page, limit } = query;
    const { data, total } = await this.floorsService.findFloorsPaginated(query);
    return ResponsePaginatedDto.fromDataAndMeta({
      data: ParkingFloorDto.fromEntities(data),
      total,
      page,
      limit,
    });
  }

  @Get(':id')
  @ApiResponseType(ParkingFloorDto)
  async findFloor(@Param('id', ParseIntPipe) id: number) {
    const floor = await this.floorsService.findFloor(id);
    return ParkingFloorDto.fromEntity(floor);
  }

  @Patch(':id')
  @ApiResponseType(ParkingFloorDto)
  async updateFloor(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateParkingFloorDto,
  ) {
    const floor = await this.floorsService.updateFloor(id, dto);
    return ParkingFloorDto.fromEntity(floor);
  }

  @Delete(':id')
  removeFloor(@Param('id', ParseIntPipe) id: number) {
    return this.floorsService.removeFloor(id);
  }
}
