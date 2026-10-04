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
import { CreateParkingSpaceDto } from '../dto/create-parking-space.dto';
import { UpdateParkingSpaceDto } from '../dto/update-parking-space.dto';
import { SpacesService } from './spaces.service';

@ApiTags('Parking Spaces')
@Controller('parking/spaces')
export class SpacesController {
  constructor(private readonly spacesService: SpacesService) {}

  @Post()
  createSpace(@Body() dto: CreateParkingSpaceDto) {
    return this.spacesService.createSpace(dto);
  }

  @Get()
  findAllSpaces(@Query('floorId') floorId?: string) {
    return this.spacesService.findAllSpaces(
      floorId === undefined ? undefined : Number(floorId),
    );
  }

  @Get(':id')
  findSpace(@Param('id', ParseIntPipe) id: number) {
    return this.spacesService.findSpace(id);
  }

  @Patch(':id')
  updateSpace(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateParkingSpaceDto,
  ) {
    return this.spacesService.updateSpace(id, dto);
  }

  @Delete(':id')
  removeSpace(@Param('id', ParseIntPipe) id: number) {
    return this.spacesService.removeSpace(id);
  }
}
