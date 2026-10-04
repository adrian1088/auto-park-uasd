import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { rejectNullValues } from '../../../shared/utils/reject-null-values';
import { Ticket } from '../../tickets/entities/ticket.entity';
import { TicketStatus } from '../../tickets/enum/ticket-status.enum';
import { CreateParkingSpaceDto } from '../dto/create-parking-space.dto';
import { UpdateParkingSpaceDto } from '../dto/update-parking-space.dto';
import { ParkingSpace } from '../entities/parking-space.entity';
import { ParkingSpaceStatus } from '../enum/parking-space-status.enum';
import { FloorsService } from '../floors/floors.service';
import { LotsService } from '../lots/lots.service';

@Injectable()
export class SpacesService {
  constructor(
    @InjectRepository(ParkingSpace)
    private readonly spacesRepository: Repository<ParkingSpace>,
    @InjectRepository(Ticket)
    private readonly ticketsRepository: Repository<Ticket>,
    private readonly floorsService: FloorsService,
    private readonly lotsService: LotsService,
  ) {}

  async createSpace(dto: CreateParkingSpaceDto): Promise<ParkingSpace> {
    const floor = await this.floorsService.findFloorWithLot(dto.floorId);
    await this.ensureSpaceNumberAvailable(dto.spaceNumber, floor.id);
    await this.lotsService.ensureLotHasCapacity(floor.parkingLot.id);
    return this.spacesRepository.save(
      this.spacesRepository.create({
        spaceNumber: dto.spaceNumber.trim(),
        type: dto.type,
        status: ParkingSpaceStatus.FREE,
        floor,
      }),
    );
  }

  findAllSpaces(floorId?: number): Promise<ParkingSpace[]> {
    return this.spacesRepository.find({
      where: floorId === undefined ? {} : { floor: { id: floorId } },
      relations: { floor: { parkingLot: true } },
      order: {
        floor: { parkingLot: { id: 'ASC' }, floorNumber: 'ASC' },
        spaceNumber: 'ASC',
      },
    });
  }

  async findSpace(id: number): Promise<ParkingSpace> {
    const space = await this.spacesRepository.findOne({
      where: { id },
      relations: { floor: { parkingLot: true } },
    });
    if (!space) {
      throw new NotFoundException('Espacio de estacionamiento no encontrado');
    }
    return space;
  }

  async updateSpace(
    id: number,
    dto: UpdateParkingSpaceDto,
  ): Promise<ParkingSpace> {
    rejectNullValues(dto);
    const space = await this.findSpace(id);
    const floorId = dto.floorId ?? space.floor.id;
    const floor = await this.floorsService.findFloorWithLot(floorId);
    const spaceNumber = dto.spaceNumber?.trim() ?? space.spaceNumber;
    await this.ensureSpaceNumberAvailable(spaceNumber, floorId, id);
    const activeTicket = await this.ticketsRepository.findOne({
      where: { spot: { id }, status: TicketStatus.ACTIVE },
    });
    if (
      activeTicket &&
      (floorId !== space.floor.id ||
        (dto.type !== undefined && dto.type !== space.type) ||
        spaceNumber !== space.spaceNumber ||
        (dto.status !== undefined && dto.status !== space.status))
    ) {
      throw new ConflictException(
        'No se puede modificar un espacio con un ticket activo',
      );
    }
    if (
      dto.status !== undefined &&
      dto.status !== space.status &&
      dto.status !== ParkingSpaceStatus.FREE &&
      dto.status !== ParkingSpaceStatus.OUT_OF_SERVICE
    ) {
      throw new ConflictException(
        'Los estados OCCUPIED y RESERVED solo pueden asignarse mediante los flujos operativos',
      );
    }
    if (floor.parkingLot.id !== space.floor.parkingLot.id) {
      await this.lotsService.ensureLotHasCapacity(floor.parkingLot.id);
    }
    space.spaceNumber = spaceNumber;
    space.type = dto.type ?? space.type;
    space.status = dto.status ?? space.status;
    space.floor = floor;
    return this.spacesRepository.save(space);
  }

  async removeSpace(id: number): Promise<ParkingSpace> {
    const space = await this.spacesRepository.findOne({
      where: { id },
      relations: { tickets: true, reservations: true },
    });
    if (!space) {
      throw new NotFoundException('Espacio de estacionamiento no encontrado');
    }
    if (space.tickets.some((ticket) => ticket.status === TicketStatus.ACTIVE)) {
      throw new ConflictException(
        'No se puede retirar un espacio con un ticket activo',
      );
    }
    space.status = ParkingSpaceStatus.OUT_OF_SERVICE;
    return this.spacesRepository.save(space);
  }

  private async ensureSpaceNumberAvailable(
    spaceNumber: string,
    floorId: number,
    excludedId?: number,
  ): Promise<void> {
    const space = await this.spacesRepository.findOne({
      where: { spaceNumber: spaceNumber.trim(), floor: { id: floorId } },
    });
    if (space && space.id !== excludedId) {
      throw new ConflictException(
        'El número de espacio ya está registrado en este piso',
      );
    }
  }
}
