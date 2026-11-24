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
import { MailService } from '../mail/mail.service';
import {
  CurrentUser,
  CurrentUserType,
} from '../../shared/decorator/current-user.decorator';
import { ApiTags } from '@nestjs/swagger';
import { ApiResponseType } from '../../shared/decorator/api-response-type.decorator';
import {
  FilterReservationPaginatedDto,
  ReservationDto,
  type ReservationComputedStatus,
} from './dto/reservation.dto';
import { ReservationsService } from './reservations.service';
import { CreateReservationDto } from './dto/create-reservation.dto';
import { UpdateReservationDto } from './dto/update-reservation.dto';
import { ResponsePaginatedDto } from '../../shared/dtos/response-paginated.dto';
import QRCode from 'qrcode';
import crypto from 'node:crypto';

const VALID_STATUSES: ReservationComputedStatus[] = [
  'CONFIRMED',
  'EXPIRED',
  'PENDING',
];

@ApiTags('Reservations')
@Controller('reservations')
export class ReservationsController {
  constructor(
    private readonly reservationsService: ReservationsService,
    private readonly mailService: MailService,
  ) {}

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
    return this.mapReservationDto(result);
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

    const mappedData = data.map((item) => this.mapReservationDto(item));

    return ResponsePaginatedDto.fromDataAndMeta({
      data: mappedData,
      total,
      page,
      limit,
    });
  }

  @Get(':id')
  @ApiResponseType(ReservationDto)
  async findOne(@Param('id', ParseIntPipe) id: number): Promise<ReservationDto> {
    const result = await this.reservationsService.findOne(id);
    return this.mapReservationDto(result);
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
    return this.mapReservationDto(result);
  }

  @Delete(':id')
  async remove(@Param('id', ParseIntPipe) id: number) {
    await this.reservationsService.remove(id);
  }

  @Post('validate-qr')
  async validateQr(@Body('code') code: string) {
    return this.reservationsService.validateByQrCode(code);
  }

  @Post('send-mail')
  async sendMail(
    @Body() createReservationDto: CreateReservationDto,
    @CurrentUser() currentUser: CurrentUserType,
  ) {
    const qrCodeToken = `RES-QR-${crypto.randomUUID()}`;
    const qrBuffer = await QRCode.toBuffer(qrCodeToken);
    await this.mailService.sendReservationEmail({
      to: currentUser.email,
      data: {
        name: currentUser.name,
        startTime: createReservationDto.startTime,
        endTime: createReservationDto.endTime,
        url: 'reservation',
        hash: qrCodeToken,
        parkingSpace: 'Piso 1, espacio A-05',
        qrBuffer,
      },
    });
  }

  // Conserva hasTicket y status calculados por el servicio al transformar con ReservationDto
  private mapReservationDto(item: unknown): ReservationDto {
    const raw = item as Record<string, unknown>;
    const dto = ReservationDto.fromEntity(item as never);

    if (typeof raw?.hasTicket === 'boolean') {
      dto.hasTicket = raw.hasTicket;
    }
    if (
      typeof raw?.status === 'string' &&
      VALID_STATUSES.includes(raw.status as ReservationComputedStatus)
    ) {
      dto.status = raw.status as ReservationComputedStatus;
    }

    return dto;
  }
}