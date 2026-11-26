import {
  BadRequestException,
  ConflictException,
  forwardRef,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  DataSource,
  EntityManager,
} from 'typeorm';
import { ParkingSpace } from '../parking/entities/parking-space.entity';
import { ParkingSpaceStatus } from '../parking/enum/parking-space-status.enum';
import { RateEntity } from '../rates/entities/rate.entity';
import { RateType } from '../rates/enum/rate-type.enum';
import { ReservationEntity } from '../reservations/entities/reservation.entity';
import { VehicleEntity } from '../vehicles/entities/vehicle.entity';
import { CheckInDto } from './dto/check-in.dto';
import { TicketEntity } from './entities/ticket.entity';
import { TicketStatus } from './enum/ticket-status.enum';
import { TicketsService } from './tickets.service';
import { CurrentUserType } from '../../shared/decorator/current-user.decorator';

@Injectable()
export class CheckInService {
  constructor(
    private readonly dataSource: DataSource,
    @Inject(forwardRef(() => TicketsService))
    private readonly ticketsService: TicketsService,
  ) {}

  async releaseOrphanOccupiedSpaces(
    manager: EntityManager,
    parkingLotId?: number,
  ): Promise<void> {
    const qb = manager
      .getRepository(ParkingSpace)
      .createQueryBuilder('space')
      .innerJoinAndSelect('space.floor', 'floor')
      .leftJoin('floor.lot', 'parkingLot')
      .leftJoin(
        TicketEntity,
        'ticket',
        'ticket.spot_id = space.id AND ticket.status = :activeStatus',
        { activeStatus: TicketStatus.ACTIVE },
      )
      .where('space.status = :occupiedStatus', {
        occupiedStatus: ParkingSpaceStatus.OCCUPIED,
      })
      .andWhere('ticket.id IS NULL');

    if (parkingLotId !== undefined) {
      qb.andWhere('parkingLot.id = :parkingLotId', { parkingLotId });
    }

    const orphanSpaces = await qb.getMany();
    if (orphanSpaces.length === 0) return;

    const affectedFloorIds = new Set<number>();

    for (const space of orphanSpaces) {
      space.status = ParkingSpaceStatus.FREE;
      await manager.getRepository(ParkingSpace).save(space);
      if (space.floor?.id) {
        affectedFloorIds.add(space.floor.id);
      }
    }

    for (const floorId of affectedFloorIds) {
      await this.ticketsService.refreshFloorStatus(manager, floorId);
    }
  }

  async cleanupOrphanSpaces(parkingLotId?: number): Promise<void> {
    await this.dataSource.transaction(async (manager) => {
      await this.releaseOrphanOccupiedSpaces(manager, parkingLotId);
    });
  }

  async checkIn(
    dto: CheckInDto,
    currentUser?: CurrentUserType,
  ): Promise<TicketEntity> {
    const ticketId = await this.dataSource.transaction(async (manager) => {
      const plateNumber = dto.plateNumber?.trim().toUpperCase();
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
              parkingSpace: { floor: { lot: true } },
            },
          });

        if (!reservationWithRelations) {
          throw new NotFoundException('Reserva no encontrada');
        }

        await this.ensureReservationAvailable(manager, reservationWithRelations.id);

        const now = new Date();
        const startTime = new Date(reservationWithRelations.startTime);
        const endTime = new Date(reservationWithRelations.endTime);

        if (startTime > now) {
          throw new ConflictException(
            'La reservación todavía no está vigente para ingresar',
          );
        }
        if (endTime <= now) {
          throw new ConflictException(
            'La reservación venció antes de registrar la entrada',
          );
        }
        if (!reservationWithRelations.vehiclePlateNumber) {
          throw new ConflictException(
            'La reserva no tiene la placa del vehículo asignada',
          );
        }
        if (
          plateNumber &&
          plateNumber !==
            reservationWithRelations.vehiclePlateNumber.trim().toUpperCase()
        ) {
          throw new BadRequestException('El vehículo no coincide con la reserva');
        }

        reservation = reservationWithRelations;
      }

      const effectiveVehiclePlateNumber =
        plateNumber ?? reservation?.vehiclePlateNumber;
      if (!effectiveVehiclePlateNumber) {
        throw new BadRequestException('Se requiere un vehículo para ingresar');
      }

      const normalizedPlate = effectiveVehiclePlateNumber.trim().toUpperCase();
      let vehicle = await manager.getRepository(VehicleEntity).findOne({
        where: { plateNumber: normalizedPlate },
        lock: { mode: 'pessimistic_write' },
      });

      if (!vehicle) {
        const spaceType = String(
          reservation?.parkingSpace?.type ?? '',
        ).toUpperCase();
        const resolvedVehicleType = (
          ['CAR', 'MOTORCYCLE', 'TRUCK', 'SUV'].includes(spaceType)
            ? spaceType
            : 'CAR'
        ) as unknown as VehicleEntity['type'];

        vehicle = manager.getRepository(VehicleEntity).create({
          plateNumber: normalizedPlate,
          make: 'Vehículo',
          model: directEntry ? 'Registro Manual' : 'Reserva',
          color: 'N/A',
          type: resolvedVehicleType,
          ownerName: directEntry
            ? 'Visitante'
            : reservation?.user?.name || 'Cliente Reserva',
        });
        vehicle = await manager.getRepository(VehicleEntity).save(vehicle);
      }

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
        throw new ConflictException('El espacio no está disponible para el ingreso');
      }

      const nowForRate = new Date();
      const rate = await manager
        .getRepository(RateEntity)
        .createQueryBuilder('rate')
        .innerJoinAndSelect('rate.parkingLot', 'parkingLot')
        .where('parkingLot.id = :parkingLotId', {
          parkingLotId: spot.floor.lot.id,
        })
        .andWhere('rate.type = :type', { type: RateType.HOURLY })
        .andWhere('rate.isActive = true')
        .andWhere('rate.validFrom <= :now', { now: nowForRate })
        .andWhere('(rate.validTo IS NULL OR rate.validTo > :now)', {
          now: nowForRate,
        })
        .getOne();

      if (!rate || Number(rate.amount) <= 0) {
        throw new NotFoundException(
          'No hay una tarifa horaria vigente para este estacionamiento',
        );
      }

      const resolvedUserId = currentUser?.id ?? reservation?.userId ?? null;
      const ticketRepository = manager.getRepository(TicketEntity);

      const ticket = ticketRepository.create({
        entranceAt: new Date(),
        exitAt: null,
        status: TicketStatus.ACTIVE,
        rateAmount: rate.amount,
        vehiclePlateNumber: vehicle.plateNumber,
        userId: resolvedUserId,
        spot,
        rate,
        reservation: reservation ? { id: reservation.id } : null,
      });

      const savedTicket = await ticketRepository.save(ticket);

      spot.status = ParkingSpaceStatus.OCCUPIED;
      await manager.getRepository(ParkingSpace).save(spot);
      await this.ticketsService.refreshFloorStatus(manager, spot.floor.id);

      return savedTicket.id;
    });

    return this.ticketsService.findOne(ticketId);
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

    const lockedSpace = await manager.getRepository(ParkingSpace).findOne({
      where: { id: reservation.parkingSpace.id },
      lock: { mode: 'pessimistic_write' },
    });
    if (!lockedSpace) {
      throw new NotFoundException('Espacio reservado no encontrado');
    }

    const space = await manager.getRepository(ParkingSpace).findOne({
      where: { id: lockedSpace.id },
      relations: { floor: { lot: true } },
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
    await this.releaseOrphanOccupiedSpaces(manager, parkingLotId);

    const candidate = await manager
      .getRepository(ParkingSpace)
      .createQueryBuilder('space')
      .innerJoin('space.floor', 'floor')
      .innerJoin('floor.lot', 'parkingLot')
      .select('space.id', 'id')
      .where('parkingLot.id = :parkingLotId', { parkingLotId })
      .andWhere('space.status = :status', { status: ParkingSpaceStatus.FREE })
      .andWhere('space.type = :vehicleType', { vehicleType: vehicle.type })
      .orderBy('floor.floorNumber', 'ASC')
      .addOrderBy('space.spaceNumber', 'ASC')
      .limit(1)
      .getRawOne<{ id: number }>();

    if (!candidate?.id) {
      throw new ConflictException(
        'No hay espacios libres compatibles en este estacionamiento',
      );
    }

    const lockedSpace = await manager.getRepository(ParkingSpace).findOne({
      where: { id: candidate.id },
      lock: { mode: 'pessimistic_write' },
    });
    if (!lockedSpace) {
      throw new ConflictException(
        'No hay espacios libres compatibles en este estacionamiento',
      );
    }

    const space = await manager.getRepository(ParkingSpace).findOne({
      where: { id: lockedSpace.id },
      relations: { floor: { lot: true } },
    });
    if (!space) {
      throw new ConflictException(
        'No hay espacios libres compatibles en este estacionamiento',
      );
    }

    if (space.status !== ParkingSpaceStatus.FREE) {
      throw new ConflictException('El espacio seleccionado ya no está disponible');
    }

    return space;
  }

  private async ensureReservationAvailable(
    manager: EntityManager,
    reservationId: number,
  ): Promise<void> {
    const existing = await manager
      .getRepository(TicketEntity)
      .createQueryBuilder('ticket')
      .innerJoin('ticket.reservation', 'reservation')
      .where('reservation.id = :reservationId', { reservationId })
      .getOne();

    if (existing) {
      throw new ConflictException('La reserva ya fue utilizada para otro ticket');
    }
  }
}