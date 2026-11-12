import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThanOrEqual, MoreThanOrEqual } from 'typeorm';
import { VehicleEntity } from '../../vehicles/entities/vehicle.entity';
import { ReservationEntity } from '../../reservations/entities/reservation.entity';
import { Subscription } from '../../subscriptions/entities/subscription.entity';
import { SubscriptionStatus } from '../../subscriptions/enum/subscription-status.enum';
import { TicketEntity } from '../../tickets/entities/ticket.entity';
import { TicketStatus } from '../../tickets/enum/ticket-status.enum';
import { TicketsService } from '../../tickets/tickets.service';
import { GateEntryDto } from '../dto/gate-entry.dto';

@Injectable()
export class GateService {
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
    @InjectRepository(ReservationEntity)
    private readonly reservationRepo: Repository<ReservationEntity>,
    @InjectRepository(Subscription)
    private readonly subscriptionRepo: Repository<Subscription>,
    @InjectRepository(TicketEntity)
    private readonly ticketRepo: Repository<TicketEntity>,
    private readonly ticketsService: TicketsService,
  ) {}

  async getValidActivePlates(): Promise<string[]> {
    const now = new Date();
    const platesSet = new Set<string>(this.defaultPlates);

    // Agregar matrículas de suscripciones activas (clientes fijos)
    // (PUEDE QUE LO QUE NO SEA NECESARIO)
    const activeSubscriptions = await this.subscriptionRepo.find({
      where: {
        status: SubscriptionStatus.ACTIVE,
        startDate: LessThanOrEqual(now),
        endDate: MoreThanOrEqual(now),
      },
    });

    activeSubscriptions.forEach((sub) => {
      if (sub.plateNumbers) {
        const plates = sub.plateNumbers
          .split(',')
          .map((p) => p.trim().toUpperCase());
        plates.forEach((p) => platesSet.add(p));
      }
    });

    // Agregar matrículas de reservas vigentes
    const activeReservations = await this.reservationRepo.find({
      where: {
        startTime: LessThanOrEqual(now),
        endTime: MoreThanOrEqual(now),
      },
      // relations: { vehicle: true },
    });

    activeReservations.forEach((res) => {
      if (res.vehiclePlateNumber) {
        platesSet.add(res.vehiclePlateNumber.trim().toUpperCase());
      }
    });

    const allCandidatePlates = Array.from(platesSet);

    // Filtrar aquellas matrículas que YA tienen un ticket activo en este momento
    const activeTickets = await this.ticketRepo.find({
      where: { status: TicketStatus.ACTIVE },
      // relations: { vehicle: true },
    });

    const activePlatesWithTicket = new Set(
      activeTickets
        .map((t) => t.vehiclePlateNumber?.trim().toUpperCase())
        .filter(Boolean),
    );

    // Devolver únicamente las matrículas que NO están dentro del estacionamiento (sin ticket activo)
    const availablePlates = allCandidatePlates.filter(
      (plate) => !activePlatesWithTicket.has(plate),
    );

    return availablePlates;
  }

  async processEntry(dto: GateEntryDto) {
    const cleanPlate = dto.plateNumber.trim().toUpperCase();
    const now = new Date();

    const validPlates = await this.getValidActivePlates();

    // Si la simulación envía una placa vacía o solicita aleatoriedad desde el frontend
    let targetPlate = cleanPlate;
    if (!targetPlate || targetPlate === 'RANDOM' || targetPlate === 'AUTO') {
      if (validPlates.length === 0) {
        throw new BadRequestException(
          'No hay matrículas disponibles sin tickets activos para simular el ingreso.',
        );
      }
      // Seleccionar una al azar de las disponibles
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

    //
    // Asegurar un userId válido para evitar el error en el check-in del ticket (SIMULADO)
    // let assignedUserId = vehicle.userId;
    // if (!assignedUserId) {
    //   const anyUser = await this.vehicleRepo.manager.findOne('User', {
    //     where: {},
    //   });
    //   assignedUserId = anyUser ? (anyUser as any).id : 1;
    // }

    const activeReservation = await this.reservationRepo.findOne({
      where: {
        vehiclePlateNumber: vehicle.plateNumber,
        startTime: LessThanOrEqual(now),
        endTime: MoreThanOrEqual(now),
      },
      relations: { parkingSpace: true },
    });

    const hasReservation = !!activeReservation;
    const reservationId = activeReservation ? activeReservation.id : undefined;
    const parkingLotId = dto.parkingLotId ?? undefined;

    try {
      const ticket = await this.ticketsService.checkIn({
        plateNumber: vehicle.plateNumber,
        // userId: assignedUserId,
        parkingLotId: parkingLotId,
        reservationId: reservationId,
      },
      undefined
    );

      return {
        ticketId: ticket.id,
        ticketNumber: ticket.code,
        plateNumber: vehicle.plateNumber,
        hasReservation,
        assignedSpace: ticket.spot ? ticket.spot.spaceNumber : 'VIP-ASIGNADO',
        entryTime: ticket.entranceAt,
      };
    } catch (error: any) {
      throw new BadRequestException(
        error.message || 'Error al procesar el ingreso en el tótem de acceso.',
      );
    }
  }
}