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
import * as nodemailer from 'nodemailer';
import { ParkingSpace } from '../parking/entities/parking-space.entity';
import { TicketEntity } from '../tickets/entities/ticket.entity';
import { UserEntity } from '../users/entities/users.entity';
import { VehicleEntity } from '../vehicles/entities/vehicle.entity';
import { CreateReservationDto } from './dto/create-reservation.dto';
import { UpdateReservationDto } from './dto/update-reservation.dto';
import { ReservationEntity } from './entities/reservation.entity';
import { CurrentUserType } from '../../shared/decorator/current-user.decorator';
import { ParkingSpaceStatus } from '../parking/enum/parking-space-status.enum';

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

      const qrCodeToken = `RES-QR-${crypto.randomUUID()}`;
      const guestEmail = user.email;
      const reservation = manager.getRepository(ReservationEntity).create({
        startTime,
        endTime,
        userId: user.id,
        guestEmail,
        qrCode: qrCodeToken,
        emailSent: false,
        parkingSpaceId: parkingSpace.id ?? null, // Dinámico al llegar al parqueo
        vehiclePlateNumber: dto.vehiclePlateNumber,
      });

      const savedReservation = await manager.getRepository(ReservationEntity).save(reservation);
      return savedReservation.id;
    });

    // Enviar el correo electrónico con el QR e instrucciones detalladas fuera de la transacción
    const createdReservation = await this.findOne(reservationId);
    if (createdReservation.guestEmail) {
      try {
        await this.sendReservationEmail(
          createdReservation.guestEmail,
          createdReservation.user?.name || 'Usuario',
          createdReservation.qrCode,
          createdReservation.startTime,
          createdReservation.endTime,
        );
        
        await this.reservationsRepository.update(reservationId, { emailSent: true });
      } catch (mailError) {
        console.error('Error al enviar el correo de reservación con el QR:', mailError);
      }
    }

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
      reservation.user = user;
      reservation.guestEmail = user.email;
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



private async sendReservationEmail(
    email: string,
    name: string,
    qrCodeToken: string,
    startTime: Date,
    endTime: Date,
  ) {
    // Generar el buffer del código QR en lugar de una URL en base64
    const qrBuffer = await QRCode.toBuffer(qrCodeToken);

    const transporter = nodemailer.createTransport({
      host: process.env.MAIL_HOST || 'smtp.gmail.com',
      port: Number(process.env.MAIL_PORT) || 587,
      secure: false,
      auth: {
        user: process.env.MAIL_USER,
        pass: process.env.MAIL_PASS,
      },
    });

    const mailOptions = {
      from: process.env.MAIL_FROM || '"AutoPark UASD" <autoparkuasd@gmail.com>',
      to: email,
      subject: '🎫 Tu Código QR y Pase de Acceso Dinámico - AutoPark UASD',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px; color: #333;">
          <h2 style="color: #0284c7; text-align: center;">¡Reservación Confirmada!</h2>
          <p>Hola <strong>${name}</strong>,</p>
          <p>Tu reservación en el sistema <strong>AutoPark UASD</strong> ha sido procesada con éxito.</p>
          
          <div style="background-color: #f8fafc; padding: 15px; border-radius: 6px; margin: 20px 0; border: 1px solid #e2e8f0;">
            <p style="margin: 5px 0;"> <strong>Inicio de Vigencia:</strong> ${new Date(startTime).toLocaleString()}</p>
            <p style="margin: 5px 0;"> <strong>Fin de Vigencia:</strong> ${new Date(endTime).toLocaleString()}</p>
          </div>

          <div style="background-color: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 6px; padding: 12px; margin-bottom: 16px; text-align: center;">
            <span style="font-size: 14px; color: #166534;">Modalidad de Ingreso:</span><br/>
            <strong style="font-size: 16px; color: #15803d;">Espacio Dinámico al Llegar</strong>
          </div>

          <p style="text-align: center; margin-bottom: 10px;"><strong>Tu Código QR de Acceso en la Entrada:</strong></p>
          <div style="text-align: center; margin: 20px 0;">
            <img src="cid:reservationQRCode" alt="Código QR de Reservación" style="width: 180px; height: 180px; border: 4px solid #f1f5f9; border-radius: 8px;" />
          </div>

          <div style="background-color: #eff6ff; border: 1px solid #bfdbfe; border-radius: 6px; padding: 12px; margin-top: 16px;">
            <p style="margin: 0; font-size: 13px; color: #1e40af;">
              <strong>¿Cómo será tu entrada al parqueo?</strong><br/>
              1. Al llegar a la entrada del parqueo, muestra este código QR en la lectora o barrera.<br/>
              2. El sistema validará tu código, te emitirá un ticket de entrada físico y te asignará de forma automática tu número de espacio disponible en ese momento.
            </p>
          </div>

          <p style="font-size: 12px; color: #64748b; text-align: center; margin-top: 30px;">
            Este es un mensaje automático del sistema AutoPark UASD. No respondas a este correo.
          </p>
        </div>
      `,
      attachments: [
        {
          filename: 'qrcode.png',
          content: qrBuffer,
          cid: 'reservationQRCode', 
        },
      ],
    };

    await transporter.sendMail(mailOptions);
    console.log(`[EMAIL RESERVACIÓN] Correo con QR adjunto (cid) enviado exitosamente a ${email}`);
  }

  private toSafeReservation(reservation: ReservationEntity): ReservationEntity {
    if (reservation.user) {
      const { password: _password, ...publicUser } = reservation.user;
      reservation.user = publicUser as UserEntity;
    }
    return reservation;
  }
}