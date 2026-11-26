import {
  BadRequestException,
  HttpException,
  Injectable,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { VehicleEntity } from '../../vehicles/entities/vehicle.entity';
import { TicketEntity } from '../../tickets/entities/ticket.entity';
import { TicketStatus } from '../../tickets/enum/ticket-status.enum';
import { ParkingSpace } from '../../parking/entities/parking-space.entity';
import { ParkingSpaceStatus } from '../../parking/enum/parking-space-status.enum';
import { TicketsService } from '../../tickets/tickets.service';
import { GateEntryDto } from '../dto/gate-entry.dto';

const NO_SPACE_IN_LOT_MESSAGE = 'No hay espacios disponibles en esta localidad';

@Injectable()
export class GateService {
  private readonly logger = new Logger(GateService.name);

  private readonly defaultPlates = [
    'A-312-XYZ',
    'B-214-ABC',
    'C-923-ZZZ',
    'D-216-WWW',
    'E-581-QQQ',
  ];

  constructor(
    private readonly dataSource: DataSource,
    @InjectRepository(VehicleEntity)
    private readonly vehicleRepo: Repository<VehicleEntity>,
    @InjectRepository(TicketEntity)
    private readonly ticketRepo: Repository<TicketEntity>,
    private readonly ticketsService: TicketsService,
  ) {}

  private describeError(error: unknown, context: string): string {
    if (error instanceof HttpException) {
      const response = error.getResponse();
      if (typeof response === 'string') return response;
      if (response && typeof response === 'object') {
        const respObj = response as { message?: string | string[]; error?: string };
        if (Array.isArray(respObj.message)) {
          return respObj.message.join(', ');
        }
        if (typeof respObj.message === 'string' && respObj.message.trim() !== '') {
          return respObj.message;
        }
        if (typeof respObj.error === 'string' && respObj.error.trim() !== '') {
          return respObj.error;
        }
      }
      return error.message || `Error HTTP en ${context}`;
    }

    if (error instanceof Error) {
      const errWithCode = error as Error & {
        code?: string | number;
        errno?: string | number;
        sqlMessage?: string;
        driverError?: { code?: string | number; message?: string };
      };
      const dbCode = errWithCode.code ?? errWithCode.errno ?? errWithCode.driverError?.code;
      const baseMsg =
        errWithCode.sqlMessage ||
        errWithCode.driverError?.message ||
        error.message ||
        error.name;
      return dbCode ? `[${context} | ${dbCode}] ${baseMsg}` : `[${context}] ${baseMsg}`;
    }

    if (typeof error === 'object' && error !== null) {
      const obj = error as { message?: unknown; error?: unknown; code?: unknown };
      const msg = obj.message ?? obj.error ?? JSON.stringify(error);
      return obj.code ? `[${context} | ${String(obj.code)}] ${String(msg)}` : `[${context}] ${String(msg)}`;
    }

    return `[${context}] ${String(error ?? 'Error desconocido')}`;
  }

  private isSpaceOrFloorIssue(lowerText: string): boolean {
    return (
      lowerText.includes('no hay espacio') ||
      lowerText.includes('no hay espacios') ||
      lowerText.includes('sin espacio') ||
      lowerText.includes('no disponible') ||
      lowerText.includes('no está disponible') ||
      lowerText.includes('full') ||
      lowerText.includes('capacidad') ||
      lowerText.includes('floor') ||
      lowerText.includes('piso') ||
      lowerText.includes('space') ||
      lowerText.includes('espacio') ||
      lowerText.includes('localidad') ||
      lowerText.includes('lot')
    );
  }

  private rethrowControlledError(
    error: unknown,
    context: string,
    hasAvailablePlates = true,
  ): never {
    const detail = this.describeError(error, context);
    const lower = detail.toLowerCase();

    if (this.isSpaceOrFloorIssue(lower) || hasAvailablePlates) {
      this.logger.warn(`[${context}] ${NO_SPACE_IN_LOT_MESSAGE}: ${detail}`);
      throw new BadRequestException(NO_SPACE_IN_LOT_MESSAGE);
    }

    if (error instanceof HttpException) {
      this.logger.warn(
        `[${context}] HttpException (${error.getStatus()}): ${detail}`,
      );
      throw error;
    }

    const stack = error instanceof Error ? error.stack : undefined;
    this.logger.error(`[${context}] Fallo capturado: ${detail}`, stack);

    throw new BadRequestException('No hay matrículas disponibles');
  }

  private async ensureLotHasFreeSpace(parkingLotId: number): Promise<void> {
    const freeCount = await this.dataSource
      .getRepository(ParkingSpace)
      .createQueryBuilder('space')
      .innerJoin('space.floor', 'floor')
      .innerJoin('floor.lot', 'lot')
      .where('lot.id = :parkingLotId', { parkingLotId })
      .andWhere('space.status = :freeStatus', {
        freeStatus: ParkingSpaceStatus.FREE,
      })
      .getCount();

    if (freeCount <= 0) {
      throw new BadRequestException(NO_SPACE_IN_LOT_MESSAGE);
    }
  }

  private async hasActiveTicket(plateNumber: string): Promise<boolean> {
    const clean = String(plateNumber ?? '').trim().toUpperCase();
    if (!clean) return false;
    const found = await this.ticketRepo.findOne({
      where: {
        vehiclePlateNumber: clean,
        status: TicketStatus.ACTIVE,
      },
    });
    return Boolean(found);
  }

  async getValidActivePlates(): Promise<string[]> {
    try {
      const platesSet = new Set<string>(this.defaultPlates);

      const activeTickets = await this.ticketRepo.find({
        where: { status: TicketStatus.ACTIVE },
      });

      const activePlatesWithTicket = new Set(
        activeTickets
          .map((t) => t.vehiclePlateNumber?.trim().toUpperCase())
          .filter(Boolean),
      );

      return Array.from(platesSet).filter(
        (plate) => !activePlatesWithTicket.has(plate),
      );
    } catch (error) {
      this.rethrowControlledError(error, 'getValidActivePlates', false);
    }
  }

  async processEntry(dto: GateEntryDto) {
    let validPlates: string[] = [];
    try {
      const cleanPlate = String(dto.plateNumber ?? '').trim().toUpperCase();
      const targetLotId = Number(dto.parkingLotId) > 0 ? Number(dto.parkingLotId) : 3;

      await this.ensureLotHasFreeSpace(targetLotId);

      validPlates = await this.getValidActivePlates();

      let targetPlate = cleanPlate;
      if (!targetPlate || targetPlate === 'RANDOM' || targetPlate === 'AUTO') {
        if (validPlates.length === 0) {
          throw new BadRequestException('No hay matrículas disponibles');
        }
        const shuffled = [...validPlates].sort(() => Math.random() - 0.5);
        targetPlate = shuffled[0];
      }

      if (await this.hasActiveTicket(targetPlate)) {
        const remaining = validPlates.filter((p) => p !== targetPlate);
        if (remaining.length === 0) {
          throw new BadRequestException('No hay matrículas disponibles');
        }
        targetPlate = remaining[Math.floor(Math.random() * remaining.length)];
      }

      let vehicle = await this.vehicleRepo.findOne({
        where: { plateNumber: targetPlate },
      });

      if (!vehicle) {
        vehicle = this.vehicleRepo.create({
          plateNumber: targetPlate,
          make: 'Vehículo',
          model: 'Autorizado',
          color: 'N/A',
          type: 'CAR' as any,
          ownerName: 'Cliente / Abonado',
        });
        vehicle = await this.vehicleRepo.save(vehicle);
      }

      let ticket: any;
      try {
        ticket = await this.ticketsService.checkIn(
          {
            plateNumber: vehicle.plateNumber,
            parkingLotId: targetLotId,
            floorNumber: 1,
          } as any,
          undefined,
        );
      } catch (checkInErr) {
        this.rethrowControlledError(
          checkInErr,
          'ticketsService.checkIn',
          validPlates.length > 0,
        );
      }

      if (ticket?.id) {
        try {
          if (typeof (this.ticketsService as any).findOne === 'function') {
            const fullTicket = await (this.ticketsService as any).findOne(ticket.id);
            if (fullTicket) {
              ticket = { ...ticket, ...fullTicket };
            }
          }
        } catch (findOneErr) {
          this.logger.warn(
            `[ticketsService.findOne] ${this.describeError(findOneErr, 'ticketsService.findOne')}`,
          );
        }
      }

      const assignedSpace =
        ticket?.spaceNumber ??
        ticket?.spot?.spaceNumber ??
        ticket?.spotNumber ??
        (ticket?.parkingSpaceId ? `#${ticket.parkingSpaceId}` : 'N/A');

      if (!assignedSpace || assignedSpace === 'N/A') {
        throw new BadRequestException(NO_SPACE_IN_LOT_MESSAGE);
      }

      const rateAmount =
        ticket?.rateAmount ??
        ticket?.rate_amount ??
        ticket?.rate?.amount ??
        null;

      return {
        ...ticket,
        ticket,
        ticketId: ticket?.id ?? null,
        ticketNumber: ticket?.code,
        plateNumber:
          ticket?.vehiclePlateNumber ??
          ticket?.plateNumber ??
          vehicle.plateNumber,
        hasReservation: false,
        assignedSpace,
        entryTime: ticket?.entranceAt ?? ticket?.entrance_at,
        rateAmount,
        rate_amount: rateAmount,
      };
    } catch (error) {
      if (
        error instanceof BadRequestException &&
        this.describeError(error, 'processEntry') === 'No hay matrículas disponibles' &&
        validPlates.length === 0
      ) {
        throw error;
      }
      this.rethrowControlledError(
        error,
        'GateService.processEntry',
        validPlates.length > 0,
      );
    }
  }
}