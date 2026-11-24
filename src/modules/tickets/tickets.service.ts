import {
  forwardRef,
  Inject,
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
import { UserEntity } from '../users/entities/users.entity';
import { CheckInService } from './check-in.service';
import { CheckOutService } from './check-out.service';
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
    @Inject(forwardRef(() => CheckInService))
    private readonly checkInService: CheckInService,
    @Inject(forwardRef(() => CheckOutService))
    private readonly checkOutService: CheckOutService,
  ) {}

  async checkIn(
    dto: CheckInDto,
    currentUser?: CurrentUserType,
  ): Promise<TicketEntity> {
    return this.checkInService.checkIn(dto, currentUser);
  }

  async checkoutQuote(id: number): Promise<CheckoutQuoteDto> {
    return this.checkOutService.quote(id);
  }

  async checkOut(id: number, dto: CheckOutDto): Promise<TicketEntity> {
    return this.checkOutService.execute(id, dto);
  }

  async findAll(filter: FilterTicketDto): Promise<TicketEntity[]> {
    const where: FindOptionsWhere<TicketEntity> = {};
    if (filter.status) where.status = filter.status;
    if (filter.code) where.code = filter.code;
    if (filter.fromDate) where.entranceAt = MoreThan(filter.fromDate);
    if (filter.toDate) where.entranceAt = LessThan(filter.toDate);

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

    if (filter.status) where.status = filter.status;
    if (filter.code) where.code = filter.code;
    if (filter.fromDate) where.entranceAt = MoreThan(filter.fromDate);
    if (filter.toDate) where.entranceAt = LessThan(filter.toDate);

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

    return {
      data: data.map((ticket) => this.toSafeTicket(ticket)),
      total,
    };
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

  async remove(id: number): Promise<void> {
    await this.dataSource.transaction(async (manager) => {
      const ticketRepository = manager.getRepository(TicketEntity);
      const ticket = await ticketRepository.findOne({
        where: { id },
        relations: { spot: { floor: true } },
      });
      if (!ticket) {
        throw new NotFoundException('Ticket no encontrado');
      }

      const spotId = ticket.spot?.id;
      const floorId = ticket.spot?.floor?.id;

      await ticketRepository.remove(ticket);

      if (spotId) {
        const remainingActive = await ticketRepository
          .createQueryBuilder('ticket')
          .where('ticket.spot_id = :spotId', { spotId })
          .andWhere('ticket.status = :activeStatus', {
            activeStatus: TicketStatus.ACTIVE,
          })
          .getCount();

        if (remainingActive === 0) {
          await manager.getRepository(ParkingSpace).update(spotId, {
            status: ParkingSpaceStatus.FREE,
          });
          if (floorId) {
            await this.refreshFloorStatus(manager, floorId);
          }
        }
      }
    });
  }

  async refreshFloorStatus(
    manager: EntityManager,
    floorId: number,
  ): Promise<void> {
    const freeSpaces = await manager.getRepository(ParkingSpace).count({
      where: { floor: { id: floorId }, status: ParkingSpaceStatus.FREE },
    });
    await manager.getRepository(ParkingFloor).update(floorId, {
      status: freeSpaces > 0 ? ParkingFloorStatus.OPEN : ParkingFloorStatus.FULL,
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