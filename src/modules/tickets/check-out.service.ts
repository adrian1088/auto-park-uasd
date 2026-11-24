import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';

import { ParkingFloor } from '../parking/entities/parking-floor.entity';
import { ParkingSpace } from '../parking/entities/parking-space.entity';
import { ParkingFloorStatus } from '../parking/enum/parking-floor-status.enum';
import { ParkingSpaceStatus } from '../parking/enum/parking-space-status.enum';

import { Payment } from '../payments/entities/payment.entity';
import { UserEntity } from '../users/entities/users.entity';

import { CheckOutDto } from './dto/check-out.dto';
import { CheckoutQuoteDto } from './dto/checkout-quote.dto';
import { TicketEntity } from './entities/ticket.entity';
import { TicketStatus } from './enum/ticket-status.enum';

@Injectable()
export class CheckOutService {
  constructor(
    private readonly dataSource: DataSource,

    @InjectRepository(TicketEntity)
    private readonly ticketsRepository: Repository<TicketEntity>,
  ) {}

  async quote(id: number): Promise<CheckoutQuoteDto> {
    const ticket = await this.ticketsRepository.findOne({
      where: { id },
      relations: {
        spot: true,
        rate: true,
        reservation: true,
        payment: true,
      },
    });

    if (!ticket) {
      throw new NotFoundException('Ticket no encontrado');
    }

    this.ensureOpenTicket(ticket);

    return this.buildQuote(ticket, new Date());
  }

  async execute(id: number, dto: CheckOutDto): Promise<TicketEntity> {
    let resolvedTicketId = Number(id);
    let resolvedUserId: number | null = null;
    let paymentAmount = 0;
    let exitAt = new Date();

    await this.dataSource.transaction(async (manager) => {
      const ticketRepository = manager.getRepository(TicketEntity);
      const parkingRepository = manager.getRepository(ParkingSpace);

      const lockedTicket = await ticketRepository.findOne({
        where: { id },
        lock: { mode: 'pessimistic_write' },
      });

      if (!lockedTicket) {
        throw new NotFoundException('Ticket no encontrado');
      }

      const loadedTicket = await ticketRepository.findOne({
        where: { id: lockedTicket.id },
        relations: {
          user: true,
          spot: { floor: true },
          reservation: true,
          rate: true,
          payment: true,
        },
      });

      if (!loadedTicket) {
        throw new NotFoundException('Ticket no encontrado');
      }

      this.ensureOpenTicket(loadedTicket);

      if (loadedTicket.payment) {
        throw new ConflictException('El ticket ya tiene un pago registrado');
      }

      exitAt = new Date();
      const quote = this.buildQuote(loadedTicket, exitAt);
      paymentAmount = Number(quote.amount);

      resolvedTicketId = Number(loadedTicket.id ?? id);
      resolvedUserId =
        loadedTicket.user?.id ?? (loadedTicket as any).userId ?? null;

      if (!loadedTicket.spot?.id) {
        throw new ConflictException('El ticket no tiene un espacio asignado');
      }

      const lockedSpot = await parkingRepository.findOne({
        where: { id: loadedTicket.spot.id },
        lock: { mode: 'pessimistic_write' },
      });

      if (!lockedSpot) {
        throw new NotFoundException('Espacio de estacionamiento no encontrado');
      }

      const spot = await parkingRepository.findOne({
        where: { id: lockedSpot.id },
        relations: { floor: true },
      });

      if (!spot) {
        throw new NotFoundException('Espacio de estacionamiento no encontrado');
      }

      if (spot.status !== ParkingSpaceStatus.OCCUPIED) {
        throw new ConflictException(
          'El espacio no figura como ocupado por este ticket',
        );
      }

      // Insertar el pago con ticket_id explícito dentro de la misma transacción
      const insertedRows = await manager.query(
        `
        INSERT INTO payments (amount, payment_date, payment_method, user_id, ticket_id)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING id, amount, payment_date, payment_method, user_id, ticket_id
        `,
        [
          paymentAmount,
          exitAt,
          dto.paymentMethod,
          resolvedUserId,
          resolvedTicketId,
        ],
      );

      const insertedId = Array.isArray(insertedRows)
        ? insertedRows[0]?.id
        : null;

      const immediatelyReadRows = await manager.query(
        `
        SELECT id, amount, payment_date, payment_method, user_id, ticket_id
        FROM payments
        WHERE id = $1
        `,
        [insertedId],
      );

      const createdPaymentRow = Array.isArray(immediatelyReadRows)
        ? immediatelyReadRows[0]
        : null;

      if (
        !createdPaymentRow ||
        createdPaymentRow.ticket_id === null ||
        Number(createdPaymentRow.ticket_id) !== resolvedTicketId
      ) {
        throw new ConflictException(
          `No se pudo persistir ticket_id=${resolvedTicketId} en el pago #${String(insertedId)}. ` +
            `Fila leída -> ${JSON.stringify(createdPaymentRow)}`,
        );
      }

      // Actualizar solo columnas del ticket sin disparar updates colaterales sobre relaciones
      await manager.query(
        `
        UPDATE tickets
        SET exit_at = $1,
            status = $2,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = $3
        `,
        [exitAt, TicketStatus.PAID, resolvedTicketId],
      );

      // Liberar el espacio directamente
      await manager.query(
        `
        UPDATE parking_spaces
        SET status = $1,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = $2
        `,
        [ParkingSpaceStatus.FREE, spot.id],
      );

      if (spot.floor?.id) {
        await this.refreshFloorStatus(manager, spot.floor.id);
      }
    });

    const updated = await this.ticketsRepository.findOne({
      where: { id },
      relations: {
        user: true,
        spot: { floor: true },
        reservation: true,
        rate: true,
        payment: true,
      },
    });

    if (!updated) {
      throw new NotFoundException('Ticket no encontrado');
    }

    if (!updated.payment) {
      const paymentRows = await this.dataSource.query(
        `
        SELECT *
        FROM payments
        WHERE ticket_id = $1
        ORDER BY id DESC
        LIMIT 1
        `,
        [resolvedTicketId],
      );
      if (Array.isArray(paymentRows) && paymentRows[0]) {
        updated.payment = paymentRows[0] as Payment;
      }
    }

    return this.toSafeTicket(updated);
  }

  private ensureOpenTicket(ticket: TicketEntity): void {
    if (ticket.status !== TicketStatus.ACTIVE || ticket.exitAt !== null) {
      throw new ConflictException('El ticket no está activo');
    }

    const hourlyRate = Number(ticket.rateAmount ?? ticket.rate?.amount ?? 0);

    if (!Number.isFinite(hourlyRate) || hourlyRate <= 0) {
      throw new BadRequestException(
        'El ticket no tiene una tarifa horaria válida; no es posible calcular la salida',
      );
    }
  }

  private buildQuote(ticket: TicketEntity, quotedAt: Date): CheckoutQuoteDto {
    this.ensureOpenTicket(ticket);

    const entranceMs = new Date(ticket.entranceAt).getTime();
    const elapsedMilliseconds = quotedAt.getTime() - entranceMs;

    if (!Number.isFinite(entranceMs) || elapsedMilliseconds < 0) {
      throw new ConflictException(
        'La hora de entrada del ticket no puede estar en el futuro',
      );
    }

    const hourlyRate = Number(ticket.rateAmount ?? ticket.rate?.amount ?? 0);

    const elapsedMinutes = Math.ceil(elapsedMilliseconds / 60_000);
    const chargedHours = Math.max(
      1,
      Math.ceil(elapsedMilliseconds / 3_600_000),
    );

    const cents = Math.round(hourlyRate * 100) * chargedHours;

    if (!Number.isSafeInteger(cents) || cents > 9_999_999_999) {
      throw new ConflictException(
        'El importe calculado supera el máximo permitido',
      );
    }

    return {
      ticketId: ticket.id,
      ticketCode: ticket.code,
      entranceAt: new Date(ticket.entranceAt),
      quotedAt,
      elapsedMinutes,
      chargedHours,
      hourlyRate: hourlyRate.toFixed(2),
      amount: (cents / 100).toFixed(2),
    };
  }

  private async refreshFloorStatus(
    manager: DataSource['manager'],
    floorId: number,
  ): Promise<void> {
    const freeSpaces = await manager.getRepository(ParkingSpace).count({
      where: {
        floor: { id: floorId },
        status: ParkingSpaceStatus.FREE,
      },
    });

    await manager.getRepository(ParkingFloor).update(floorId, {
      status:
        freeSpaces > 0 ? ParkingFloorStatus.OPEN : ParkingFloorStatus.FULL,
    });
  }

  private toSafeTicket(ticket: TicketEntity): TicketEntity {
    if (ticket.user) {
      const { password: _password, ...publicUser } = ticket.user;
      ticket.user = publicUser as UserEntity;
    }

    return ticket;
  }
}