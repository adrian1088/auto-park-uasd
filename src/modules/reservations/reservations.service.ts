import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, Repository } from 'typeorm';
import { ParkingSpace } from '../parking/entities/parking-space.entity';
import { TicketEntity } from '../tickets/entities/ticket.entity';
import { UserEntity } from '../users/entities/users.entity';
import { VehicleEntity } from '../vehicles/entities/vehicle.entity';
import { CreateReservationDto } from './dto/create-reservation.dto';
import { UpdateReservationDto } from './dto/update-reservation.dto';
import { ReservationEntity } from './entities/reservation.entity';
import { CurrentUserType } from '../../shared/decorator/current-user.decorator';

@Injectable()
export class ReservationsService {
  constructor(
    private readonly dataSource: DataSource,
    @InjectRepository(ReservationEntity)
    private readonly reservationsRepository: Repository<ReservationEntity>,
  ) {}

  async create(
    dto: CreateReservationDto,
    currentUser: CurrentUserType,
  ): Promise<ReservationEntity> {
    const reservationId = await this.dataSource.transaction(async (manager) => {
      const startTime = this.parseDate(dto.startTime, 'startTime');
      const endTime = this.parseDate(dto.endTime, 'endTime');
      this.validatePeriod(startTime, endTime);

      const parkingSpace = await this.lockParkingSpace(
        manager,
        dto.parkingSpaceId,
      );
      const user = await this.findUser(manager, currentUser.id);
      const vehicle =
        dto.vehiclePlateNumber == null
          ? null
          : await this.findVehicle(manager, dto.vehiclePlateNumber);
      this.validateVehicleCompatibility(vehicle, parkingSpace);
      await this.ensureNoOverlap(manager, parkingSpace.id, startTime, endTime);

      const reservation = manager.getRepository(ReservationEntity).create({
        startTime,
        endTime,
        userId: user.id,
        parkingSpaceId: parkingSpace.id,
        vehiclePlateNumber: dto.vehiclePlateNumber,
      });
      return (await manager.getRepository(ReservationEntity).save(reservation)).id;
    });
    return this.findOne(reservationId);
  }

  async findPaginated({ skip = 0, take = 10 }: { skip?: number; take?: number }): Promise<{ data: ReservationEntity[]; total: number }> {
    const [reservations, total] = await this.reservationsRepository.findAndCount({
      relations: { user: true, parkingSpace: { floor: { lot: true } } },
      order: { startTime: 'ASC', id: 'DESC' },
      skip,
      take,
    });
    return {
      data: reservations.map((reservation) => this.toSafeReservation(reservation)),
      total,
    };
  }

  async findOne(id: number): Promise<ReservationEntity> {
    const reservation = await this.reservationsRepository.findOne({
      where: { id },
      relations: {
        user: true,
        parkingSpace: { floor: { lot: true } },
      },
    });
    if (!reservation) {
      throw new NotFoundException('Reserva no encontrada');
    }
    return this.toSafeReservation(reservation);
  }

  async update(
    id: number,
    dto: UpdateReservationDto,
    currentUser: CurrentUserType,
  ): Promise<ReservationEntity> {
    await this.dataSource.transaction(async (manager) => {
      const reservationRepository = manager.getRepository(ReservationEntity);
      const reservation = await reservationRepository.findOne({
        where: { id },
        lock: { mode: 'pessimistic_write' },
      });
      if (!reservation) {
        throw new NotFoundException('Reserva no encontrada');
      }
      await this.ensureNotUsed(manager, id);
      const reservationWithRelations = await reservationRepository.findOne({
        where: { id },
        relations: { user: true, parkingSpace: true },
      });
      if (
        !reservationWithRelations?.user ||
        !reservationWithRelations.parkingSpace
      ) {
        throw new ConflictException(
          'La reserva no tiene sus relaciones requeridas',
        );
      }

      const startTime =
        dto.startTime === undefined
          ? reservationWithRelations.startTime
          : this.parseDate(dto.startTime, 'startTime');
      const endTime =
        dto.endTime === undefined
          ? reservationWithRelations.endTime
          : this.parseDate(dto.endTime, 'endTime');
      this.validatePeriod(startTime, endTime);

      const parkingSpaceId =
        dto.parkingSpaceId ?? reservationWithRelations.parkingSpace.id;
      const parkingSpace = await this.lockParkingSpace(manager, parkingSpaceId);
      const userId = currentUser.id ?? reservationWithRelations.user.id;
      const user = await this.findUser(manager, userId);
      const vehicleId =
        dto.vehiclePlateNumber === undefined
          ? (reservationWithRelations.vehiclePlateNumber ?? null)
          : dto.vehiclePlateNumber;
      const vehicle =
        vehicleId == null ? null : await this.findVehicle(manager, vehicleId);
      this.validateVehicleCompatibility(vehicle, parkingSpace);
      await this.ensureNoOverlap(
        manager,
        parkingSpace.id,
        startTime,
        endTime,
        id,
      );

      reservation.startTime = startTime;
      reservation.endTime = endTime;
      reservation.parkingSpace = parkingSpace;
      reservation.user = user;
      reservation.vehiclePlateNumber = vehicle.plateNumber;
      await reservationRepository.save(reservation);
    });
    return this.findOne(id);
  }

  async remove(id: number): Promise<void> {
    await this.dataSource.transaction(async (manager) => {
      const reservationRepository = manager.getRepository(ReservationEntity);
      const reservation = await reservationRepository.findOne({
        where: { id },
        lock: { mode: 'pessimistic_write' },
      });
      if (!reservation) {
        throw new NotFoundException('Reserva no encontrada');
      }
      await this.ensureNotUsed(manager, id);
      await reservationRepository.remove(reservation);
    });
  }

  private async lockParkingSpace(
    manager: EntityManager,
    id: number,
  ): Promise<ParkingSpace> {
    const parkingSpace = await manager.getRepository(ParkingSpace).findOne({
      where: { id },
      lock: { mode: 'pessimistic_write' },
    });
    if (!parkingSpace) {
      throw new NotFoundException('Espacio de estacionamiento no encontrado');
    }
    return parkingSpace;
  }

  private async findUser(
    manager: EntityManager,
    id: number,
  ): Promise<UserEntity> {
    const user = await manager.getRepository(UserEntity).findOneBy({ id });
    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }
    return user;
  }

  private async findVehicle(
    manager: EntityManager,
    plateNumber: string,
  ): Promise<VehicleEntity> {
    const vehicle = await manager
      .getRepository(VehicleEntity)
      .findOneBy({ plateNumber });
    if (!vehicle) {
      throw new NotFoundException('Vehículo no encontrado');
    }
    return vehicle;
  }

  private validateVehicleCompatibility(
    vehicle: VehicleEntity | null,
    parkingSpace: ParkingSpace,
  ): void {
    if (vehicle && String(vehicle.type) !== String(parkingSpace.type)) {
      throw new ConflictException(
        'El espacio no es compatible con el vehículo',
      );
    }
  }

  private validatePeriod(startTime: Date, endTime: Date): void {
    if (endTime <= startTime) {
      throw new BadRequestException(
        'La fecha de fin debe ser posterior a la fecha de inicio',
      );
    }
  }

  private parseDate(value: string, field: string): Date {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      throw new BadRequestException(`La fecha ${field} es inválida`);
    }
    return date;
  }

  private async ensureNoOverlap(
    manager: EntityManager,
    parkingSpaceId: number,
    startTime: Date,
    endTime: Date,
    excludedId?: number,
  ): Promise<void> {
    const query = manager
      .getRepository(ReservationEntity)
      .createQueryBuilder('reservation')
      .innerJoin('reservation.parkingSpace', 'parkingSpace')
      .where('parkingSpace.id = :parkingSpaceId', { parkingSpaceId })
      .andWhere('reservation.startTime < :endTime', { endTime })
      .andWhere('reservation.endTime > :startTime', { startTime });

    if (excludedId !== undefined) {
      query.andWhere('reservation.id != :excludedId', { excludedId });
    }
    if (await query.getOne()) {
      throw new ConflictException(
        'El espacio ya tiene una reserva en ese horario',
      );
    }
  }

  private async ensureNotUsed(
    manager: EntityManager,
    id: number,
  ): Promise<void> {
    const ticket = await manager.getRepository(TicketEntity).findOne({
      where: { reservation: { id } },
    });
    if (ticket) {
      throw new ConflictException(
        'No se puede modificar una reserva asociada a un ticket',
      );
    }
  }

  private toSafeReservation(reservation: ReservationEntity): ReservationEntity {
    if (reservation.user) {
      const { password: _password, ...publicUser } = reservation.user;
      reservation.user = publicUser as UserEntity;
    }
    return reservation;
  }
}
