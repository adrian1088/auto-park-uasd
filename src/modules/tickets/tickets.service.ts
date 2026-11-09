import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  DataSource,
  EntityManager,
  FindOptionsWhere,
  LessThan,
  MoreThan,
  Repository,
} from 'typeorm';
import { ParkingFloor } from '../parking/entities/parking-floor.entity';
import { ParkingSpace } from '../parking/entities/parking-space.entity';
import { ParkingFloorStatus } from '../parking/enum/parking-floor-status.enum';
import { ParkingSpaceStatus } from '../parking/enum/parking-space-status.enum';
import { Payment } from '../payments/entities/payment.entity';
import { PaymentMethod } from '../payments/enum/payment-method.enum';
import { RateEntity } from '../rates/entities/rate.entity';
import { RateType } from '../rates/enum/rate-type.enum';
import { ReservationEntity } from '../reservations/entities/reservation.entity';
import { UserEntity } from '../users/entities/users.entity';
import { UserStatus } from '../users/enums/users-status.enum';
import { VehicleEntity } from '../vehicles/entities/vehicle.entity';
import { CheckInDto } from './dto/check-in.dto';
import { CheckOutDto } from './dto/check-out.dto';
import { CheckoutQuoteDto } from './dto/checkout-quote.dto';
import { TicketEntity } from './entities/ticket.entity';
import { TicketStatus } from './enum/ticket-status.enum';
import { FilterTicketDto, FilterTicketPaginatedDto } from './dto/ticket.dto';
import { CurrentUserType } from '../../shared/decorator/current-user.decorator';

@Injectable()
export class TicketsService {
  constructor(
    private readonly dataSource: DataSource,
    @InjectRepository(TicketEntity)
    private readonly ticketsRepository: Repository<TicketEntity>,
  ) {}

  async checkIn(
    dto: CheckInDto,
    currentUser: CurrentUserType,
  ): Promise<TicketEntity> {
    const ticketId = await this.dataSource.transaction(async (manager) => {
      const plateNumber = dto.plateNumber;
      const userId = currentUser.id;
      const directEntry = dto.reservationId === undefined;
      if (directEntry && (!plateNumber || !dto.parkingLotId)) {
        throw new BadRequestException(
          'El ingreso directo requiere licensePlate y parkingLotId',
        );
      }
      if (!directEntry && dto.parkingLotId !== undefined) {
        throw new BadRequestException(
          'No se debe enviar parkingLotId cuando se ingresa con reservationId',
        );
      }

      const lockedReservation =
        dto.reservationId === undefined
          ? null
          : await this.lockReservation(manager, dto.reservationId);
      let reservation: ReservationEntity | null = null;
      if (lockedReservation) {
        const reservationWithRelations = await manager
          .getRepository(ReservationEntity)
          .findOne({
            where: { id: lockedReservation.id },
            relations: {
              user: true,
              parkingSpace: { floor: true },
            },
          });
        if (!reservationWithRelations) {
          throw new NotFoundException('Reserva no encontrada');
        }
        const now = new Date();
        if (
          reservationWithRelations.startTime > now ||
          reservationWithRelations.endTime <= now
        ) {
          throw new ConflictException(
            'La reserva no está vigente para ingresar',
          );
        }
        // TODO: Validar si es necesario esto mas adelante
        if (!reservationWithRelations.vehiclePlateNumber) {
          throw new ConflictException(
            'La reserva no tiene la placa del vehículo asignada',
          );
        }
        if (
          plateNumber !== undefined &&
          plateNumber !== reservationWithRelations.vehiclePlateNumber
        ) {
          throw new BadRequestException(
            'El vehículo no coincide con la reserva',
          );
        }
        // if (
        //   userId !== undefined &&
        //   userId !== reservationWithRelations.user.id
        // ) {
        //   throw new BadRequestException(
        //     'El usuario no coincide con la reserva',
        //   );
        // }
        reservation = reservationWithRelations;
      }

      const effectiveVehiclePlateNumber =
        plateNumber ?? reservation?.vehiclePlateNumber;
      // const effectiveUserId = userId ?? reservation?.user?.id;
      if (!effectiveVehiclePlateNumber) {
        throw new BadRequestException('Se requiere un vehículo para ingresar');
      }
      const vehicle = await manager.getRepository(VehicleEntity).findOne({
        where: { plateNumber: effectiveVehiclePlateNumber },
        lock: { mode: 'pessimistic_write' },
      });
      if (!vehicle) {
        throw new NotFoundException('Vehículo no encontrado');
      }
      // const user = await manager
      //   .getRepository(UserEntity)
      //   .findOneBy({ id: effectiveUserId });
      // if (!user) {
      //   throw new NotFoundException('Usuario no encontrado');
      // }
      // if (user.status !== UserStatus.ACTIVE) {
      //   throw new ConflictException(
      //     'El usuario está inactivo y no puede ingresar',
      //   );
      // }
      const activeTicket = await manager.getRepository(TicketEntity).findOne({
        where: {
          vehiclePlateNumber: vehicle.plateNumber,
          status: TicketStatus.ACTIVE,
        },
      });
      if (activeTicket) {
        throw new ConflictException('El vehículo ya tiene un ticket activo');
      }

      const spot = reservation
        ? await this.lockReservedSpace(manager, reservation.id)
        : await this.lockAvailableSpace(manager, dto.parkingLotId!, vehicle);
      if (String(spot.type) !== String(vehicle.type)) {
        throw new ConflictException(
          'El espacio reservado no es compatible con el vehículo',
        );
      }
      if (
        spot.status !== ParkingSpaceStatus.FREE &&
        !(reservation && spot.status === ParkingSpaceStatus.RESERVED)
      ) {
        throw new ConflictException(
          'El espacio no está disponible para el ingreso',
        );
      }
      const rate = await manager
        .getRepository(RateEntity)
        .createQueryBuilder('rate')
        .innerJoinAndSelect('rate.parkingLot', 'parkingLot')
        .where('parkingLot.id = :parkingLotId', {
          parkingLotId: spot.floor.lot.id,
        })
        .andWhere('rate.type = :type', { type: RateType.HOURLY })
        .andWhere('rate.isActive = true')
        .andWhere('rate.validFrom <= :now', { now: new Date() })
        .andWhere('(rate.validTo IS NULL OR rate.validTo > :now)', {
          now: new Date(),
        })
        .getOne();
      if (!rate || Number(rate.amount) <= 0) {
        throw new NotFoundException(
          'No hay una tarifa horaria vigente para este estacionamiento',
        );
      }
      if (reservation) {
        await this.ensureReservationAvailable(manager, reservation.id);
      }

      const ticket = manager.getRepository(TicketEntity).create({
        entranceAt: new Date(),
        exitAt: null,
        status: TicketStatus.ACTIVE,
        rateAmount: rate.amount,
        vehiclePlateNumber: vehicle.plateNumber,
        userId: currentUser.id,
        spot,
        reservation,
        rate,
      });
      const savedTicket = await manager.getRepository(TicketEntity).save(ticket);
      spot.status = ParkingSpaceStatus.OCCUPIED;
      await manager.getRepository(ParkingSpace).save(spot);
      await this.refreshFloorStatus(manager, spot.floor.id);
      return savedTicket.id;
    });
    return this.findOne(ticketId);
  }

  async findAll(filter: FilterTicketDto): Promise<TicketEntity[]> {
    const where: FindOptionsWhere<TicketEntity> = {};
    if (filter.status) {
      where.status = filter.status;
    }
    if (filter.code) {
      where.code = filter.code;
    }
    if (filter.fromDate) {
      where.entranceAt = MoreThan(filter.fromDate);
    }
    if (filter.toDate) {
      where.entranceAt = LessThan(filter.toDate);
    }
    const tickets = await this.ticketsRepository.find({
      where,
      relations: {
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

  async findPaginated(
    filter: FilterTicketPaginatedDto,
  ): Promise<{ data: TicketEntity[]; total: number }> {
    const skip = (filter.page - 1) * filter.limit;
    const take = filter.limit;
    const where: FindOptionsWhere<TicketEntity> = {};
    if (filter.status) {
      where.status = filter.status;
    }
    if (filter.code) {
      where.code = filter.code;
    }
    if (filter.fromDate) {
      where.entranceAt = MoreThan(filter.fromDate);
    }
    if (filter.toDate) {
      where.entranceAt = LessThan(filter.toDate);
    }
    const [data, total] = await this.ticketsRepository.findAndCount({
      where,
      relations: {
        user: true,
        spot: { floor: true },
        reservation: true,
        rate: true,
        payment: true,
      },
      skip,
      take,
      order: { id: 'DESC' },
    });
    return { data, total };
  }

  async findOne(id: number): Promise<TicketEntity> {
    const ticket = await this.ticketsRepository.findOne({
      where: { id },
      relations: {
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

  async checkOut(id: number, dto: CheckOutDto): Promise<TicketEntity> {
    await this.dataSource.transaction(async (manager) => {
      const ticketRepository = manager.getRepository(TicketEntity);
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
        throw new ConflictException(
          'El espacio no figura como ocupado por este ticket',
        );
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
      await ticketRepository.save(loadedTicket);

      spot.status = ParkingSpaceStatus.FREE;
      await manager.getRepository(ParkingSpace).save(spot);
      await this.refreshFloorStatus(manager, spot.floor.id);
    });
    return this.findOne(id);
  }

  private async lockReservation(
    manager: EntityManager,
    id: number,
  ): Promise<ReservationEntity> {
    const reservation = await manager.getRepository(ReservationEntity).findOne({
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
    const reservation = await manager.getRepository(ReservationEntity).findOne({
      where: { id: reservationId },
      relations: { parkingSpace: true },
    });
    if (!reservation?.parkingSpace) {
      throw new ConflictException('La reserva no tiene un espacio asignado');
    }
    const space = await manager.getRepository(ParkingSpace).findOne({
      where: { id: reservation.parkingSpace.id },
      relations: { floor: { lot: true } },
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
    vehicle: VehicleEntity,
  ): Promise<ParkingSpace> {
    const space = await manager
      .getRepository(ParkingSpace)
      .createQueryBuilder('space')
      .innerJoinAndSelect('space.floor', 'floor')
      .innerJoinAndSelect('floor.lot', 'parkingLot')
      .where('parkingLot.id = :parkingLotId', { parkingLotId })
      .andWhere('space.status = :status', { status: ParkingSpaceStatus.FREE })
      .andWhere('space.type = :vehicleType', { vehicleType: vehicle.type })
      .orderBy('floor.floorNumber', 'ASC')
      .addOrderBy('space.spaceNumber', 'ASC')
      .setLock('pessimistic_write', undefined, ['space'])
      .setOnLocked('skip_locked')
      .getOne();
    console.log(space);
    if (!space) {
      throw new ConflictException(
        'No hay espacios libres compatibles en este estacionamiento',
      );
    }
    return space;
  }

  private async ensureReservationAvailable(
    manager: EntityManager,
    reservationId: number,
  ): Promise<void> {
    const existing = await manager.getRepository(TicketEntity).findOne({
      where: { reservation: { id: reservationId } },
    });
    if (existing) {
      throw new ConflictException(
        'La reserva ya fue utilizada para otro ticket',
      );
    }
  }

  private async refreshFloorStatus(
    manager: EntityManager,
    floorId: number,
  ): Promise<void> {
    const freeSpaces = await manager.getRepository(ParkingSpace).count({
      where: { floor: { id: floorId }, status: ParkingSpaceStatus.FREE },
    });
    await manager.getRepository(ParkingFloor).update(floorId, {
      status:
        freeSpaces > 0 ? ParkingFloorStatus.OPEN : ParkingFloorStatus.FULL,
    });
  }

  private ensureOpenTicket(ticket: TicketEntity): void {
    if (ticket.status !== TicketStatus.ACTIVE || ticket.exitAt !== null) {
      throw new ConflictException('El ticket no está activo');
    }
    if (
      !Number.isFinite(Number(ticket.rateAmount)) ||
      Number(ticket.rateAmount) <= 0
    ) {
      throw new ConflictException(
        'El ticket no tiene una tarifa horaria válida; no es posible calcular la salida',
      );
    }
  }

  private buildQuote(ticket: TicketEntity, quotedAt: Date): CheckoutQuoteDto {
    this.ensureOpenTicket(ticket);
    const elapsedMilliseconds =
      quotedAt.getTime() - ticket.entranceAt.getTime();
    if (elapsedMilliseconds < 0) {
      throw new ConflictException(
        'La hora de entrada del ticket no puede estar en el futuro',
      );
    }
    const elapsedMinutes = Math.ceil(elapsedMilliseconds / 60_000);
    const chargedHours = Math.max(
      1,
      Math.ceil(elapsedMilliseconds / 3_600_000),
    );
    const cents = Math.round(Number(ticket.rateAmount) * 100) * chargedHours;
    if (!Number.isSafeInteger(cents) || cents > 9_999_999_999) {
      throw new ConflictException(
        'El importe calculado supera el máximo permitido',
      );
    }
    return {
      ticketId: ticket.id,
      ticketCode: ticket.code,
      entranceAt: ticket.entranceAt,
      quotedAt,
      elapsedMinutes,
      chargedHours,
      hourlyRate: Number(ticket.rateAmount).toFixed(2),
      amount: (cents / 100).toFixed(2),
    };
  }

  private toSafeTicket(ticket: TicketEntity): TicketEntity {
    if (ticket.user) {
      const { password: _password, ...publicUser } = ticket.user;
      ticket.user = publicUser as UserEntity;
    }
    return ticket;
  }
}
