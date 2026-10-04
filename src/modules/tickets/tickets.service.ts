import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, Repository } from 'typeorm';
import { ParkingFloor } from '../parking/entities/parking-floor.entity';
import { ParkingSpace } from '../parking/entities/parking-space.entity';
import { ParkingFloorStatus } from '../parking/enum/parking-floor-status.enum';
import { ParkingSpaceStatus } from '../parking/enum/parking-space-status.enum';
import { Payment } from '../payments/entities/payment.entity';
import { PaymentMethod } from '../payments/enum/payment-method.enum';
import { Rate } from '../rates/entities/rate.entity';
import { RateType } from '../rates/enum/rate-type.enum';
import { Reservation } from '../reservations/entities/reservation.entity';
import { User } from '../users/entities/users.entity';
import { UserStatus } from '../users/enums/users-status.enum';
import { Vehicle } from '../vehicles/entities/vehicle.entity';
import { CheckInDto } from './dto/check-in.dto';
import { CheckOutDto } from './dto/check-out.dto';
import { CheckoutQuoteDto } from './dto/checkout-quote.dto';
import { Ticket } from './entities/ticket.entity';
import { TicketStatus } from './enum/ticket-status.enum';

@Injectable()
export class TicketsService {
  constructor(
    private readonly dataSource: DataSource,
    @InjectRepository(Ticket)
    private readonly ticketsRepository: Repository<Ticket>,
  ) {}

  async checkIn(dto: CheckInDto): Promise<Ticket> {
    const ticketId = await this.dataSource.transaction(async (manager) => {
      const vehicleId = dto.vehicleId;
      const userId = dto.userId;
      const directEntry = dto.reservationId === undefined;
      if (directEntry && (!vehicleId || !userId || !dto.parkingLotId)) {
        throw new BadRequestException(
          'El ingreso directo requiere vehicleId, userId y parkingLotId',
        );
      }
      if (!directEntry && dto.parkingLotId !== undefined) {
        throw new BadRequestException(
          'No se debe enviar parkingLotId cuando se ingresa con reservationId',
        );
      }

      const lockedReservation = dto.reservationId === undefined
        ? null
        : await this.lockReservation(manager, dto.reservationId);
      let reservation: Reservation | null = null;
      if (lockedReservation) {
        const reservationWithRelations = await manager.getRepository(Reservation).findOne({
          where: { id: lockedReservation.id },
          relations: { user: true, vehicle: true, parkingSpace: { floor: true } },
        });
        if (!reservationWithRelations) {
          throw new NotFoundException('Reserva no encontrada');
        }
        const now = new Date();
        if (reservationWithRelations.startTime > now || reservationWithRelations.endTime <= now) {
          throw new ConflictException('La reserva no está vigente para ingresar');
        }
        if (!reservationWithRelations.vehicle) {
          throw new ConflictException('La reserva no tiene un vehículo asignado');
        }
        if (vehicleId !== undefined && vehicleId !== reservationWithRelations.vehicle.id) {
          throw new BadRequestException('El vehículo no coincide con la reserva');
        }
        if (userId !== undefined && userId !== reservationWithRelations.user.id) {
          throw new BadRequestException('El usuario no coincide con la reserva');
        }
        reservation = reservationWithRelations;
      }

      const effectiveVehicleId = vehicleId ?? reservation?.vehicle?.id;
      const effectiveUserId = userId ?? reservation?.user?.id;
      if (!effectiveVehicleId || !effectiveUserId) {
        throw new BadRequestException('Se requiere un vehículo y usuario para ingresar');
      }
      const vehicle = await manager.getRepository(Vehicle).findOne({
        where: { id: effectiveVehicleId },
        lock: { mode: 'pessimistic_write' },
      });
      if (!vehicle) {
        throw new NotFoundException('Vehículo no encontrado');
      }
      const user = await manager.getRepository(User).findOneBy({ id: effectiveUserId });
      if (!user) {
        throw new NotFoundException('Usuario no encontrado');
      }
      if (user.status !== UserStatus.ACTIVE) {
        throw new ConflictException('El usuario está inactivo y no puede ingresar');
      }
      const activeTicket = await manager.getRepository(Ticket).findOne({
        where: { vehicle: { id: vehicle.id }, status: TicketStatus.ACTIVE },
      });
      if (activeTicket) {
        throw new ConflictException('El vehículo ya tiene un ticket activo');
      }

      const spot = reservation
        ? await this.lockReservedSpace(manager, reservation.id)
        : await this.lockAvailableSpace(manager, dto.parkingLotId!, vehicle);
      if (String(spot.type) !== String(vehicle.type)) {
        throw new ConflictException('El espacio reservado no es compatible con el vehículo');
      }
      if (
        spot.status !== ParkingSpaceStatus.FREE &&
        !(reservation && spot.status === ParkingSpaceStatus.RESERVED)
      ) {
        throw new ConflictException('El espacio no está disponible para el ingreso');
      }
      const rate = await manager
        .getRepository(Rate)
        .createQueryBuilder('rate')
        .innerJoinAndSelect('rate.parkingLot', 'parkingLot')
        .where('parkingLot.id = :parkingLotId', { parkingLotId: spot.floor.parkingLot.id })
        .andWhere('rate.type = :type', { type: RateType.HOURLY })
        .andWhere('rate.isActive = true')
        .andWhere('rate.validFrom <= :now', { now: new Date() })
        .andWhere('(rate.validTo IS NULL OR rate.validTo > :now)', { now: new Date() })
        .getOne();
      if (!rate || Number(rate.amount) <= 0) {
        throw new NotFoundException('No hay una tarifa horaria vigente para este estacionamiento');
      }
      if (reservation) {
        await this.ensureReservationAvailable(manager, reservation.id);
      }

      const ticket = manager.getRepository(Ticket).create({
        entranceAt: new Date(),
        exitAt: null,
        status: TicketStatus.ACTIVE,
        amount: 0,
        rateAmount: Number(rate.amount).toFixed(2),
        vehicle,
        user,
        spot,
        reservation,
        rate,
      });
      const savedTicket = await manager.getRepository(Ticket).save(ticket);
      spot.status = ParkingSpaceStatus.OCCUPIED;
      await manager.getRepository(ParkingSpace).save(spot);
      await this.refreshFloorStatus(manager, spot.floor.id);
      return savedTicket.id;
    });
    return this.findOne(ticketId);
  }

  async findAll(): Promise<Ticket[]> {
    const tickets = await this.ticketsRepository.find({
      relations: {
        vehicle: true,
        user: true,
        spot: { floor: true },
        reservation: true,
        rate: true,
        payment: true,
      },
      order: { id: 'DESC' },
    });
    return tickets.map((ticket) => this.toSafeTicket(ticket));
  }

  async findOne(id: number): Promise<Ticket> {
    const ticket = await this.ticketsRepository.findOne({
      where: { id },
      relations: {
        vehicle: true,
        user: true,
        spot: { floor: true },
        reservation: true,
        rate: true,
        payment: true,
      },
    });
    if (!ticket) {
      throw new NotFoundException('Ticket no encontrado');
    }
    return this.toSafeTicket(ticket);
  }

  async checkoutQuote(id: number): Promise<CheckoutQuoteDto> {
    const ticket = await this.ticketsRepository.findOne({
      where: { id },
      relations: { spot: true },
    });
    if (!ticket) {
      throw new NotFoundException('Ticket no encontrado');
    }
    this.ensureOpenTicket(ticket);
    return this.buildQuote(ticket, new Date());
  }

  async checkOut(id: number, dto: CheckOutDto): Promise<Ticket> {
    await this.dataSource.transaction(async (manager) => {
      const ticketRepository = manager.getRepository(Ticket);
      const ticket = await ticketRepository.findOne({
        where: { id },
        lock: { mode: 'pessimistic_write' },
      });
      if (!ticket) {
        throw new NotFoundException('Ticket no encontrado');
      }
      const loadedTicket = await ticketRepository.findOne({
        where: { id },
        relations: { user: true, spot: { floor: true }, payment: true },
      });
      if (!loadedTicket) {
        throw new NotFoundException('Ticket no encontrado');
      }
      this.ensureOpenTicket(loadedTicket);
      if (loadedTicket.payment) {
        throw new ConflictException('El ticket ya tiene un pago registrado');
      }
      const exitAt = new Date();
      const quote = this.buildQuote(loadedTicket, exitAt);
      const spot = await manager.getRepository(ParkingSpace).findOne({
        where: { id: loadedTicket.spot.id },
        relations: { floor: true },
        lock: { mode: 'pessimistic_write' },
      });
      if (!spot) {
        throw new NotFoundException('Espacio de estacionamiento no encontrado');
      }
      if (spot.status !== ParkingSpaceStatus.OCCUPIED) {
        throw new ConflictException('El espacio no figura como ocupado por este ticket');
      }

      const payment = manager.getRepository(Payment).create({
        amount: Number(quote.amount),
        paymentDate: exitAt,
        paymentMethod: dto.paymentMethod as PaymentMethod,
        user: loadedTicket.user,
        ticket: loadedTicket,
      });
      await manager.getRepository(Payment).save(payment);

      loadedTicket.exitAt = exitAt;
      loadedTicket.status = TicketStatus.PAID;
      loadedTicket.amount = Number(quote.amount);
      await ticketRepository.save(loadedTicket);

      spot.status = ParkingSpaceStatus.FREE;
      await manager.getRepository(ParkingSpace).save(spot);
      await this.refreshFloorStatus(manager, spot.floor.id);
    });
    return this.findOne(id);
  }

  private async lockReservation(manager: EntityManager, id: number): Promise<Reservation> {
    const reservation = await manager.getRepository(Reservation).findOne({
      where: { id },
      lock: { mode: 'pessimistic_write' },
    });
    if (!reservation) {
      throw new NotFoundException('Reserva no encontrada');
    }
    return reservation;
  }

  private async lockReservedSpace(
    manager: EntityManager,
    reservationId: number,
  ): Promise<ParkingSpace> {
    const reservation = await manager.getRepository(Reservation).findOne({
      where: { id: reservationId },
      relations: { parkingSpace: true },
    });
    if (!reservation?.parkingSpace) {
      throw new ConflictException('La reserva no tiene un espacio asignado');
    }
    const space = await manager.getRepository(ParkingSpace).findOne({
      where: { id: reservation.parkingSpace.id },
      relations: { floor: { parkingLot: true } },
      lock: { mode: 'pessimistic_write' },
    });
    if (!space) {
      throw new NotFoundException('Espacio reservado no encontrado');
    }
    return space;
  }

  private async lockAvailableSpace(
    manager: EntityManager,
    parkingLotId: number,
    vehicle: Vehicle,
  ): Promise<ParkingSpace> {
    const space = await manager
      .getRepository(ParkingSpace)
      .createQueryBuilder('space')
      .innerJoinAndSelect('space.floor', 'floor')
      .innerJoinAndSelect('floor.parkingLot', 'parkingLot')
      .where('parkingLot.id = :parkingLotId', { parkingLotId })
      .andWhere('space.status = :status', { status: ParkingSpaceStatus.FREE })
      .andWhere('space.type = :vehicleType', { vehicleType: vehicle.type })
      .orderBy('floor.floorNumber', 'ASC')
      .addOrderBy('space.spaceNumber', 'ASC')
      .setLock('pessimistic_write', undefined, ['space'])
      .setOnLocked('skip_locked')
      .getOne();
    if (!space) {
      throw new ConflictException('No hay espacios libres compatibles en este estacionamiento');
    }
    return space;
  }

  private async ensureReservationAvailable(
    manager: EntityManager,
    reservationId: number,
  ): Promise<void> {
    const existing = await manager.getRepository(Ticket).findOne({
      where: { reservation: { id: reservationId } },
    });
    if (existing) {
      throw new ConflictException('La reserva ya fue utilizada para otro ticket');
    }
  }

  private async refreshFloorStatus(manager: EntityManager, floorId: number): Promise<void> {
    const freeSpaces = await manager.getRepository(ParkingSpace).count({
      where: { floor: { id: floorId }, status: ParkingSpaceStatus.FREE },
    });
    await manager.getRepository(ParkingFloor).update(floorId, {
      status: freeSpaces > 0 ? ParkingFloorStatus.OPEN : ParkingFloorStatus.FULL,
    });
  }

  private ensureOpenTicket(ticket: Ticket): void {
    if (ticket.status !== TicketStatus.ACTIVE || ticket.exitAt !== null) {
      throw new ConflictException('El ticket no está activo');
    }
    if (!Number.isFinite(Number(ticket.rateAmount)) || Number(ticket.rateAmount) <= 0) {
      throw new ConflictException(
        'El ticket no tiene una tarifa horaria válida; no es posible calcular la salida',
      );
    }
  }

  private buildQuote(ticket: Ticket, quotedAt: Date): CheckoutQuoteDto {
    this.ensureOpenTicket(ticket);
    const elapsedMilliseconds = quotedAt.getTime() - ticket.entranceAt.getTime();
    if (elapsedMilliseconds < 0) {
      throw new ConflictException('La hora de entrada del ticket no puede estar en el futuro');
    }
    const elapsedMinutes = Math.ceil(elapsedMilliseconds / 60_000);
    const chargedHours = Math.max(1, Math.ceil(elapsedMilliseconds / 3_600_000));
    const cents = Math.round(Number(ticket.rateAmount) * 100) * chargedHours;
    if (!Number.isSafeInteger(cents) || cents > 9_999_999_999) {
      throw new ConflictException('El importe calculado supera el máximo permitido');
    }
    return {
      ticketId: ticket.id,
      entranceAt: ticket.entranceAt,
      quotedAt,
      elapsedMinutes,
      chargedHours,
      hourlyRate: Number(ticket.rateAmount).toFixed(2),
      amount: (cents / 100).toFixed(2),
    };
  }

  private toSafeTicket(ticket: Ticket): Ticket {
    if (ticket.user) {
      const { password: _password, ...publicUser } = ticket.user;
      ticket.user = publicUser as User;
    }
    return ticket;
  }
}
