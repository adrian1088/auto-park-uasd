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
import { CurrentUser } from '../../shared/decorator/current-user.decorator';
import { CurrentUserType } from '../../shared/decorator/current-user.decorator';
import { ApiTags } from '@nestjs/swagger';
import { ApiResponseType } from '../../shared/decorator/api-response-type.decorator';
import { FilterReservationPaginatedDto, ReservationDto } from './dto/reservation.dto'; 
import { ReservationsService } from './reservations.service';
import { CreateReservationDto } from './dto/create-reservation.dto';
import { UpdateReservationDto } from './dto/update-reservation.dto';
import { ResponsePaginatedDto } from '../../shared/dtos/response-paginated.dto';

@ApiTags('Reservations')
@Controller('reservations')
export class ReservationsController {
  constructor(private readonly reservationsService: ReservationsService) {}

  @Post()
  @ApiResponseType(ReservationDto)
  async create(
    @Body() createReservationDto: CreateReservationDto,
    @CurrentUser() currentUser: CurrentUserType,
  ): Promise<ReservationDto> {
    const result = await this.reservationsService.create(
      createReservationDto,
      currentUser,
    );
    return ReservationDto.fromEntity(result);
  }

  @Get('paginated')
  @ApiResponseType(ReservationDto, {
    type: 'paginated',
  })
  async findPaginated(
    @Query() filter: FilterReservationPaginatedDto,
  ): Promise<ResponsePaginatedDto<ReservationDto>> {
    const { page, limit } = filter;
    const { data, total } = await this.reservationsService.findPaginated({
      skip: (page - 1) * limit,
      take: limit,
    });
    return ResponsePaginatedDto.fromDataAndMeta({
      data: ReservationDto.fromEntities(data),
      total: total,
      page,
      limit,
    });
  }

  @Get(':id')
  @ApiResponseType(ReservationDto)
  async findOne(@Param('id', ParseIntPipe) id: number): Promise<ReservationDto> {
     const result = await this.reservationsService.findOne(id);
     return ReservationDto.fromEntity(result);
  }

  @Patch(':id')
  @ApiResponseType(ReservationDto)
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateReservationDto: UpdateReservationDto,
    @CurrentUser() currentUser: CurrentUserType,
  ): Promise<ReservationDto> {
    const result = await this.reservationsService.update(
      id,
      updateReservationDto,
      currentUser,
    );
    return ReservationDto.fromEntity(result);
  }

  @Delete(':id')
  async remove(@Param('id', ParseIntPipe) id: number) {
    await this.reservationsService.remove(id);
  }
}
