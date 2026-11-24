import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, Repository } from 'typeorm';
import * as crypto from 'crypto';
import * as QRCode from 'qrcode';
import { ParkingSpace } from '../parking/entities/parking-space.entity';
import { ParkingSpaceStatus } from '../parking/enum/parking-space-status.enum';
import { TicketEntity } from '../tickets/entities/ticket.entity';
import { TicketStatus } from '../tickets/enum/ticket-status.enum';
import { UserEntity } from '../users/entities/users.entity';
import { VehicleEntity } from '../vehicles/entities/vehicle.entity';
import { CreateReservationDto } from './dto/create-reservation.dto';
import { UpdateReservationDto } from './dto/update-reservation.dto';
import { ReservationEntity } from './entities/reservation.entity';
import { CurrentUserType } from '../../shared/decorator/current-user.decorator';
import { MailService } from '../mail/mail.service';

export enum UserRole {
  ADMIN = 'admin',
  USER = 'user',
  OPERATOR = 'operator',
}

const PRIMICIA_MINUTES = 25;
const PAST_DATE_TOLERANCE_MS = 60 * 1000;

@Injectable()
export class ReservationsService {
  constructor(
    private readonly dataSource: DataSource,
    @InjectRepository(ReservationEntity)
    private readonly reservationsRepository: Repository<ReservationEntity>,
    private readonly mailService: MailService,
  ) {}

  async create(
    dto: CreateReservationDto,
    currentUser: CurrentUserType,
  ): Promise<ReservationEntity> {
    const isStaff = this.isStaffRole(currentUser?.role);
    const { recipientName, recipientEmail } = await this.resolveRecipient(
      dto as CreateReservationDto & { clientName?: string; clientEmail?: string },
      currentUser,
      isStaff,
    );

    const reservationId = await this.dataSource.transaction(async (manager) => {
      const startTime = this.parseDate(dto.startTime, 'startTime');
      this.validateNotPastDate(startTime);

      const endTime = this.calculatePrimiciaEndTime(startTime);
      this.validatePeriod(startTime, endTime);

      const normalizedPlate = this.normalizePlate(dto.vehiclePlateNumber);
      if (normalizedPlate) {
        await this.ensurePlateAvailable(manager, normalizedPlate, startTime, endTime);
      }

      const parkingSpace = await this.lockParkingSpace(manager, dto.parkingSpaceId);
      if (
        parkingSpace.status !== ParkingSpaceStatus.FREE &&
        parkingSpace.status !== ParkingSpaceStatus.RESERVED
      ) {
        throw new ConflictException('El espacio seleccionado no está disponible para reservar.');
      }

      const vehicle = normalizedPlate
        ? await this.findOptionalVehicle(manager, normalizedPlate)
        : null;
      this.validateVehicleCompatibility(vehicle, parkingSpace);
      await this.ensureNoOverlap(manager, parkingSpace.id, startTime, endTime);

      // Crea la reserva con su código QR y bloquea el espacio mientras espera llegada
      const saved = await manager.getRepository(ReservationEntity).save(
        manager.getRepository(ReservationEntity).create({
          startTime,
          endTime,
          userId: isStaff ? null : currentUser.id,
          guestEmail: recipientEmail,
          qrCode: `RES-QR-${crypto.randomUUID()}`,
          emailSent: false,
          parkingSpaceId: parkingSpace.id,
          vehiclePlateNumber: vehicle ? vehicle.plateNumber : normalizedPlate,
        }),
      );

      await this.setSpaceStatus(manager, parkingSpace.id, ParkingSpaceStatus.RESERVED);
      return saved.id;
    });

    const created = await this.findOne(reservationId);
    const emailToSend = created.guestEmail || recipientEmail;

    // Si falla el envío del correo con el QR, revierte la reserva creada
    if (emailToSend) {
      try {
        await this.sendReservationQrEmail(
          reservationId,
          emailToSend,
          recipientName || created.user?.name || 'Cliente',
          created,
        );
      } catch (mailError) {
        await this.remove(reservationId);
        throw mailError;
      }
    }

    return this.findOne(reservationId);
  }

  async findPaginated({ skip = 0, take = 10 }: { skip?: number; take?: number }) {
    await this.releaseExpiredReservations();

    const [reservations, total] = await this.reservationsRepository.findAndCount({
      relations: { user: true, parkingSpace: { floor: { lot: true } } },
      order: { startTime: 'ASC', id: 'DESC' },
      skip,
      take,
    });

    const confirmedIds = await this.getConfirmedReservationIds(reservations);
    const now = new Date();

    return {
      data: reservations.map((r) => ({
        ...this.toSafeReservation(r),
        ...this.buildReservationStatus(r, confirmedIds.has(Number(r.id)), now),
      })),
      total,
    };
  }

  async findOne(id: number): Promise<ReservationEntity> {
    await this.releaseExpiredReservations();

    const reservation = await this.reservationsRepository.findOne({
      where: { id },
      relations: { user: true, parkingSpace: { floor: { lot: true } } },
    });
    if (!reservation) throw new NotFoundException('Reserva no encontrada');

    const confirmedIds = await this.getConfirmedReservationIds([reservation]);
    const statusInfo = this.buildReservationStatus(
      reservation,
      confirmedIds.has(Number(reservation.id)),
      new Date(),
    );

    return {
      ...this.toSafeReservation(reservation),
      ...statusInfo,
    } as ReservationEntity;
  }

  async update(
    id: number,
    dto: UpdateReservationDto,
    currentUser: CurrentUserType,
  ): Promise<ReservationEntity> {
    await this.dataSource.transaction(async (manager) => {
      const repo = manager.getRepository(ReservationEntity);
      const reservation = await repo.findOne({
        where: { id },
        lock: { mode: 'pessimistic_write' },
      });
      if (!reservation) throw new NotFoundException('Reserva no encontrada');

      await this.ensureNotUsed(manager, id);

      const current = await repo.findOne({
        where: { id },
        relations: { user: true, parkingSpace: true },
      });
      if (!current?.parkingSpace) {
        throw new ConflictException('La reserva no tiene su espacio requerido');
      }

      const startTime =
        dto.startTime === undefined
          ? current.startTime
          : this.parseDate(dto.startTime, 'startTime');
      if (dto.startTime !== undefined) this.validateNotPastDate(startTime);

      const endTime =
        dto.startTime !== undefined
          ? this.calculatePrimiciaEndTime(startTime)
          : dto.endTime === undefined
            ? current.endTime
            : this.parseDate(dto.endTime, 'endTime');
      this.validatePeriod(startTime, endTime);

      const normalizedPlate =
        dto.vehiclePlateNumber === undefined
          ? (current.vehiclePlateNumber ?? null)
          : this.normalizePlate(dto.vehiclePlateNumber);

      if (normalizedPlate) {
        await this.ensurePlateAvailable(manager, normalizedPlate, startTime, endTime, id);
      }

      const previousSpaceId = current.parkingSpace.id;
      const parkingSpace = await this.lockParkingSpace(
        manager,
        dto.parkingSpaceId ?? previousSpaceId,
      );

      if (
        previousSpaceId !== parkingSpace.id &&
        parkingSpace.status !== ParkingSpaceStatus.FREE
      ) {
        throw new ConflictException('El nuevo espacio seleccionado no está libre.');
      }

      const vehicle = normalizedPlate
        ? await this.findOptionalVehicle(manager, normalizedPlate)
        : null;
      this.validateVehicleCompatibility(vehicle, parkingSpace);
      await this.ensureNoOverlap(manager, parkingSpace.id, startTime, endTime, id);

      reservation.startTime = startTime;
      reservation.endTime = endTime;
      reservation.parkingSpaceId = parkingSpace.id;
      reservation.userId = this.isStaffRole(currentUser?.role)
        ? current.userId
        : (currentUser.id ?? current.userId);
      reservation.vehiclePlateNumber = vehicle ? vehicle.plateNumber : normalizedPlate;

      await repo.save(reservation);

      // Libera el espacio anterior si la reserva cambió de espacio
      if (previousSpaceId !== parkingSpace.id) {
        await this.setSpaceStatus(manager, previousSpaceId, ParkingSpaceStatus.FREE);
      }
      await this.setSpaceStatus(manager, parkingSpace.id, ParkingSpaceStatus.RESERVED);
    });

    return this.findOne(id);
  }

  async remove(id: number): Promise<void> {
    await this.dataSource.transaction(async (manager) => {
      const repo = manager.getRepository(ReservationEntity);
      const reservation = await repo.findOne({
        where: { id },
        lock: { mode: 'pessimistic_write' },
      });
      if (!reservation) throw new NotFoundException('Reserva no encontrada');

      await this.ensureNotUsed(manager, id);

      const spaceIdToFree = reservation.parkingSpaceId;
      await repo.remove(reservation);

      if (spaceIdToFree) {
        await this.setSpaceStatus(manager, spaceIdToFree, ParkingSpaceStatus.FREE);
      }
    });
  }

  async validateByQrCode(rawCode: string) {
    const code = String(rawCode ?? '').trim();
    if (!code) throw new BadRequestException('Debes proporcionar un código QR.');

    const reservation = await this.reservationsRepository.findOne({
      where: { qrCode: code },
      relations: { parkingSpace: { floor: { lot: true } } },
    });
    if (!reservation) {
      throw new NotFoundException('No se encontró ninguna reservación con ese código QR.');
    }

    const confirmedIds = await this.getConfirmedReservationIds([reservation]);
    const hasTicket = confirmedIds.has(Number(reservation.id));
    const now = new Date();
    const start = new Date(reservation.startTime);
    const end = new Date(reservation.endTime);

    if (now < start) {
      throw new ConflictException(
        `La reservación aún no está vigente. Inicia el ${start.toLocaleString('es-DO')}.`,
      );
    }

    // Si ya tiene ticket, sigue siendo válida aunque haya pasado el tiempo de primicia
    if (now >= end && !hasTicket) {
      await this.releaseExpiredReservations();
      throw new ConflictException(
        `La reservación está vencida o fuera de vigencia (venció el ${end.toLocaleString('es-DO')}).`,
      );
    }

    const spaceId = reservation.parkingSpace?.id ?? reservation.parkingSpaceId;

    return {
      valid: true,
      id: reservation.id,
      hasTicket,
      status: hasTicket ? 'CONFIRMED' : 'PENDING',
      vehiclePlateNumber: reservation.vehiclePlateNumber ?? null,
      parkingSpaceId: spaceId ?? null,
      parkingLotId: reservation.parkingSpace?.floor?.lot?.id ?? 1,
      startTime: reservation.startTime,
      endTime: reservation.endTime,
    };
  }

  // Un ticket vinculado siempre confirma la reserva, sin importar si está activo o pagado
  private buildReservationStatus(
    reservation: ReservationEntity,
    hasTicket: boolean,
    now: Date,
  ): { hasTicket: boolean; status: 'CONFIRMED' | 'EXPIRED' | 'PENDING' } {
    const status = hasTicket
      ? 'CONFIRMED'
      : new Date(reservation.endTime) <= now
        ? 'EXPIRED'
        : 'PENDING';
    return { hasTicket, status };
  }

  // Busca los IDs de reservas que tienen al menos un ticket relacionado
  private async getConfirmedReservationIds(
    reservations: ReservationEntity[],
  ): Promise<Set<number>> {
    const confirmed = new Set<number>();
    const validIds = reservations
      .map((r) => Number(r.id))
      .filter((id) => Number.isInteger(id) && id > 0);

    if (validIds.length === 0) return confirmed;

    const rows = await this.dataSource
      .getRepository(TicketEntity)
      .createQueryBuilder('ticket')
      .innerJoin('ticket.reservation', 'reservation')
      .select('reservation.id', 'reservation_id')
      .where('reservation.id IN (:...ids)', { ids: validIds })
      .distinct(true)
      .getRawMany<{ reservation_id: number | string }>();

    for (const row of rows) {
      const reservationId = Number(row.reservation_id);
      if (Number.isInteger(reservationId) && reservationId > 0) {
        confirmed.add(reservationId);
      }
    }

    return confirmed;
  }

  // Solo libera espacios de reservas vencidas que no llegaron a generar ticket
  private async releaseExpiredReservations(): Promise<void> {
    const now = new Date();

    await this.dataSource.transaction(async (manager) => {
      const expired = await manager
        .getRepository(ReservationEntity)
        .createQueryBuilder('reservation')
        .leftJoin('reservation.ticket', 'ticket')
        .where('reservation.endTime <= :now', { now })
        .andWhere('ticket.id IS NULL')
        .andWhere('reservation.parkingSpaceId IS NOT NULL')
        .select(['reservation.id', 'reservation.parkingSpaceId'])
        .getMany();

      for (const r of expired) {
        if (!r.parkingSpaceId) continue;

        const space = await manager.getRepository(ParkingSpace).findOne({
          where: { id: r.parkingSpaceId },
          lock: { mode: 'pessimistic_write' },
        });

        if (space && space.status === ParkingSpaceStatus.RESERVED) {
          await this.setSpaceStatus(manager, space.id, ParkingSpaceStatus.FREE);
        }
      }
    });
  }

  private async resolveRecipient(
    rawDto: CreateReservationDto & { clientName?: string; clientEmail?: string },
    currentUser: CurrentUserType,
    isStaff: boolean,
  ) {
    const clientName = rawDto.clientName?.trim() || '';
    const clientEmail = rawDto.clientEmail?.trim()?.toLowerCase() || '';

    if (isStaff) {
      if (!clientName) throw new BadRequestException('El nombre del cliente es obligatorio.');
      if (!clientEmail) throw new BadRequestException('El correo del cliente es obligatorio.');
      return { recipientName: clientName, recipientEmail: clientEmail };
    }

    const user = await this.findUserById(currentUser.id);
    return {
      recipientName: user.name || 'Usuario',
      recipientEmail: user.email || '',
    };
  }

  private normalizePlate(plate?: string | null): string | null {
    return !plate || plate.trim() === '' ? null : plate.trim().toUpperCase();
  }

  private async setSpaceStatus(
    manager: EntityManager,
    spaceId: number,
    status: ParkingSpaceStatus,
  ) {
    await manager.getRepository(ParkingSpace).update(spaceId, { status });
  }

  private isStaffRole(role?: unknown): boolean {
    const normalized = String(role || '').toLowerCase();
    return normalized === UserRole.ADMIN || normalized === UserRole.OPERATOR;
  }

  private async findUserById(id: number): Promise<UserEntity> {
    const user = await this.dataSource.getRepository(UserEntity).findOneBy({ id });
    if (!user) throw new NotFoundException('Usuario no encontrado');
    return user;
  }

  private async lockParkingSpace(manager: EntityManager, id: number): Promise<ParkingSpace> {
    const space = await manager.getRepository(ParkingSpace).findOne({
      where: { id },
      lock: { mode: 'pessimistic_write' },
    });
    if (!space) throw new NotFoundException('Espacio de estacionamiento no encontrado');
    return space;
  }

  private async findOptionalVehicle(
    manager: EntityManager,
    plateNumber: string,
  ): Promise<VehicleEntity | null> {
    return manager.getRepository(VehicleEntity).findOneBy({
      plateNumber: plateNumber.trim().toUpperCase(),
    });
  }

  private validateVehicleCompatibility(
    vehicle: VehicleEntity | null,
    parkingSpace: ParkingSpace,
  ): void {
    if (vehicle && String(vehicle.type) !== String(parkingSpace.type)) {
      throw new ConflictException('El espacio no es compatible con el vehículo');
    }
  }

  private validateNotPastDate(arrivalDate: Date): void {
    if (arrivalDate.getTime() < Date.now() - PAST_DATE_TOLERANCE_MS) {
      throw new BadRequestException('La fecha y hora de llegada debe ser presente o futura.');
    }
  }

  private calculatePrimiciaEndTime(arrivalDate: Date): Date {
    return new Date(arrivalDate.getTime() + PRIMICIA_MINUTES * 60 * 1000);
  }

  private validatePeriod(startTime: Date, endTime: Date): void {
    if (endTime <= startTime) {
      throw new BadRequestException('La fecha de fin debe ser posterior a la fecha de inicio');
    }
  }

  private parseDate(value: string, field: string): Date {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      throw new BadRequestException(`La fecha ${field} es inválida`);
    }
    return date;
  }

  private async ensurePlateAvailable(
    manager: EntityManager,
    plateNumber: string,
    startTime: Date,
    endTime: Date,
    excludedReservationId?: number,
  ): Promise<void> {
    const activeTicket = await manager.getRepository(TicketEntity).findOne({
      where: { vehiclePlateNumber: plateNumber, status: TicketStatus.ACTIVE },
    });
    if (activeTicket) {
      throw new ConflictException(
        `El vehículo con matrícula ${plateNumber} ya tiene un ticket activo.`,
      );
    }

    const qb = manager
      .getRepository(ReservationEntity)
      .createQueryBuilder('reservation')
      .where('UPPER(TRIM(reservation.vehiclePlateNumber)) = :plate', { plate: plateNumber })
      .andWhere('reservation.startTime < :endTime', { endTime })
      .andWhere('reservation.endTime > :startTime', { startTime });

    if (excludedReservationId !== undefined) {
      qb.andWhere('reservation.id != :excludedId', { excludedId: excludedReservationId });
    }
    if (await qb.getOne()) {
      throw new ConflictException(
        `El vehículo con matrícula ${plateNumber} ya tiene una reservación en ese horario.`,
      );
    }
  }

  private async ensureNoOverlap(
    manager: EntityManager,
    parkingSpaceId: number,
    startTime: Date,
    endTime: Date,
    excludedId?: number,
  ): Promise<void> {
    const qb = manager
      .getRepository(ReservationEntity)
      .createQueryBuilder('reservation')
      .innerJoin('reservation.parkingSpace', 'parkingSpace')
      .where('parkingSpace.id = :parkingSpaceId', { parkingSpaceId })
      .andWhere('reservation.startTime < :endTime', { endTime })
      .andWhere('reservation.endTime > :startTime', { startTime });

    if (excludedId !== undefined) {
      qb.andWhere('reservation.id != :excludedId', { excludedId });
    }
    if (await qb.getOne()) {
      throw new ConflictException('El espacio ya tiene una reserva en ese horario');
    }
  }

  private async ensureNotUsed(manager: EntityManager, id: number): Promise<void> {
    const ticket = await manager.getRepository(TicketEntity).findOne({
      where: { reservation: { id } },
    });
    if (ticket) {
      throw new ConflictException('No se puede modificar una reserva asociada a un ticket');
    }
  }

  private async sendReservationQrEmail(
    reservationId: number,
    email: string,
    name: string,
    reservation: ReservationEntity,
  ) {
    try {
      const qrBuffer = await QRCode.toBuffer(reservation.qrCode);
      await this.mailService.sendReservationEmail({
        to: email,
        data: {
          name,
          startTime: new Date(reservation.startTime).toLocaleString(),
          endTime: new Date(reservation.endTime).toLocaleString(),
          url: 'reservations',
          hash: reservation.qrCode,
          parkingSpace: 'Espacio Dinámico al Llegar',
          qrBuffer,
        },
      });
      await this.reservationsRepository.update(reservationId, { emailSent: true });
    } catch (mailError) {
      console.error('Error al enviar el correo de reservación con el QR:', mailError);
      throw new BadRequestException(
        'No se pudo enviar el correo de confirmación con el código QR; la reservación no se completó.',
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