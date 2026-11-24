import {
  BadRequestException,
  HttpException,
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { VehicleEntity } from '../../vehicles/entities/vehicle.entity';
import { TicketEntity } from '../../tickets/entities/ticket.entity';
import { TicketStatus } from '../../tickets/enum/ticket-status.enum';
import { TicketsService } from '../../tickets/tickets.service';
import { GateEntryDto } from '../dto/gate-entry.dto';

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

  private rethrowAsHttpError(error: unknown, context: string): never {
    if (error instanceof HttpException) {
      this.logger.warn(
        `[${context}] HttpException (${error.getStatus()}): ${this.describeError(error, context)}`,
      );
      throw error;
    }

    const detail = this.describeError(error, context);
    const stack = error instanceof Error ? error.stack : undefined;
    this.logger.error(`[${context}] Fallo capturado: ${detail}`, stack);

    throw new InternalServerErrorException({
      statusCode: 500,
      error: 'GateEntryError',
      context,
      message: detail,
    });
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
      this.rethrowAsHttpError(error, 'getValidActivePlates');
    }
  }

  async processEntry(dto: GateEntryDto) {
    try {
      const cleanPlate = String(dto.plateNumber ?? '').trim().toUpperCase();
      const validPlates = await this.getValidActivePlates();

      let targetPlate = cleanPlate;
      if (!targetPlate || targetPlate === 'RANDOM' || targetPlate === 'AUTO') {
        if (validPlates.length === 0) {
          throw new BadRequestException(
            'No hay matrículas disponibles sin tickets activos para simular el ingreso.',
          );
        }
        const randomIndex = Math.floor(Math.random() * validPlates.length);
        targetPlate = validPlates[randomIndex];
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
            parkingLotId: dto.parkingLotId ?? undefined,
          },
          undefined,
        );
      } catch (checkInErr) {
        this.rethrowAsHttpError(checkInErr, 'ticketsService.checkIn');
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
      this.rethrowAsHttpError(error, 'GateService.processEntry');
    }
  }
}