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
import { CreateParkingSpaceDto } from '../dto/create-parking-space.dto';
import { UpdateParkingSpaceDto } from '../dto/update-parking-space.dto';
import { SpacesService } from './spaces.service';
import { ApiResponseType } from '../../../shared/decorator/api-response-type.decorator';
import {
  FindParkingSpacesDto,
  FindParkingSpacesPaginatedDto,
  ParkingSpaceDto,
} from '../dto/parking-space.dto';
import { ResponsePaginatedDto } from '../../../shared/dtos/response-paginated.dto';

@ApiTags('Parking Spaces')
@Controller('parking/spaces')
export class SpacesController {
  constructor(private readonly spacesService: SpacesService) {}

  @Post()
  @ApiResponseType(ParkingSpaceDto, {
    type: 'single',
    status: HttpStatus.CREATED,
  })
  async createSpace(@Body() dto: CreateParkingSpaceDto) {
    const space = await this.spacesService.createSpace(dto);
    return ParkingSpaceDto.fromEntity(space);
  }

  @Get()
  @ApiResponseType(ParkingSpaceDto, { type: 'array' })
  async findAllSpaces(
    @Query() query: FindParkingSpacesDto,
  ) {
    const spaces = await this.spacesService.findAllSpaces(
      query.lotId === undefined ? undefined : Number(query.lotId),
      query.floorId === undefined ? undefined : Number(query.floorId),
    );
    return ParkingSpaceDto.fromEntities(spaces);
  }

  @Get('paginated')
  @ApiResponseType(ParkingSpaceDto, { type: 'paginated' })
  async findSpacesPaginated(
    @Query() query: FindParkingSpacesPaginatedDto,
  ): Promise<ResponsePaginatedDto<ParkingSpaceDto>> {
    const { page, limit } = query;
    const { data, total } = await this.spacesService.findSpacesPaginated(query);
    return ResponsePaginatedDto.fromDataAndMeta({
      data: ParkingSpaceDto.fromEntities(data),
      page,
      limit,
      total,
    });
  }

  @Get(':id')
  @ApiResponseType(ParkingSpaceDto)
  async findSpace(@Param('id', ParseIntPipe) id: number) {
    const space = await this.spacesService.findSpace(id);
    return ParkingSpaceDto.fromEntity(space);
  }

  @Patch(':id')
  @ApiResponseType(ParkingSpaceDto)
  async updateSpace(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateParkingSpaceDto,
  ) {
    const space = await this.spacesService.updateSpace(id, dto);
    return ParkingSpaceDto.fromEntity(space);
  }

  @Delete(':id')
  @ApiResponseType(ParkingSpaceDto)
  async removeSpace(@Param('id', ParseIntPipe) id: number) {
    const space = await this.spacesService.removeSpace(id);
    return ParkingSpaceDto.fromEntity(space);
  }
}
