import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Rate } from '../rates/entities/rate.entity';
import { Ticket } from '../tickets/entities/ticket.entity';
import { TicketStatus } from '../tickets/enum/ticket-status.enum';
import { CreateParkingFloorDto } from './dto/create-parking-floor.dto';
import { CreateParkingLotDto } from './dto/create-parking-lot.dto';
import { CreateParkingSpaceDto } from './dto/create-parking-space.dto';
import { UpdateParkingFloorDto } from './dto/update-parking-floor.dto';
import { UpdateParkingLotDto } from './dto/update-parking-lot.dto';
import { UpdateParkingSpaceDto } from './dto/update-parking-space.dto';
import { ParkingFloor } from './entities/parking-floor.entity';
import { ParkingLot } from './entities/parking-lot.entity';
import { ParkingSpace } from './entities/parking-space.entity';
import { ParkingFloorStatus } from './enum/parking-floor-status.enum';
import { ParkingSpaceStatus } from './enum/parking-space-status.enum';
import { ResponsePaginatedDto } from '../../shared/dtos/response-paginated.dto';
import { FindParkingLotsDto, ParkingLotDto } from './dto/parking-lot.dto';

@Injectable()
export class ParkingService {
  constructor(
    @InjectRepository(ParkingLot)
    private readonly lotsRepository: Repository<ParkingLot>,
    @InjectRepository(ParkingFloor)
    private readonly floorsRepository: Repository<ParkingFloor>,
    @InjectRepository(ParkingSpace)
    private readonly spacesRepository: Repository<ParkingSpace>,
    @InjectRepository(Rate)
    private readonly ratesRepository: Repository<Rate>,
    @InjectRepository(Ticket)
    private readonly ticketsRepository: Repository<Ticket>,
  ) {}

  createLot(dto: CreateParkingLotDto): Promise<ParkingLot> {
    return this.lotsRepository.save(this.lotsRepository.create(dto));
  }

  async findAllLots({
    page,
    limit,
  }: FindParkingLotsDto): Promise<{data: ParkingLot[]; total: number;}> {
    const skip = (page - 1) * limit;
    const [lots, total] = await this.lotsRepository.findAndCount({
      relations: { floors: { spaces: true }, rates: true },
      order: { id: 'DESC' },
      skip,
      take: limit,
    });
	return{data: lots, total};
  }

  async findLot(id: number): Promise<ParkingLot> {
    const lot = await this.lotsRepository.findOne({
      where: { id },
      relations: { floors: { spaces: true }, rates: true },
    });
    if (!lot) {
      throw new NotFoundException('Estacionamiento no encontrado');
    }
    return lot;
  }

  async updateLot(id: number, dto: UpdateParkingLotDto): Promise<ParkingLot> {
    this.rejectNullValues(dto);
    const lot = await this.findLot(id);
    if (dto.capacity !== undefined) {
      const currentSpaceCount = await this.countSpacesInLot(id);
      if (dto.capacity < currentSpaceCount) {
        throw new ConflictException(
          'La capacidad no puede ser menor que la cantidad de espacios configurados',
        );
      }
    }
    Object.assign(lot, dto);
	return await this.lotsRepository.save(lot);
  }

  async removeLot(id: number): Promise<void> {
    const lot = await this.lotsRepository.findOne({
      where: { id },
      relations: { floors: true, rates: true },
    });
    if (!lot) {
      throw new NotFoundException('Estacionamiento no encontrado');
    }
    if (lot.floors.length || lot.rates.length) {
      throw new ConflictException(
        'No se puede eliminar un estacionamiento con pisos o tarifas asociados',
      );
    }
    await this.lotsRepository.remove(lot);
  }

  async createFloor(dto: CreateParkingFloorDto): Promise<ParkingFloor> {
    const parkingLot = await this.lotsRepository.findOneBy({
      id: dto.parkingLotId,
    });
    if (!parkingLot) {
      throw new NotFoundException('Estacionamiento no encontrado');
    }
    await this.ensureFloorNumberAvailable(parkingLot.id, dto.floorNumber);
    return this.floorsRepository.save(
      this.floorsRepository.create({
        floorNumber: dto.floorNumber,
        status: ParkingFloorStatus.OPEN,
        parkingLot,
      }),
    );
  }

  findAllFloors(parkingLotId?: number): Promise<ParkingFloor[]> {
    return this.floorsRepository.find({
      where:
        parkingLotId === undefined ? {} : { parkingLot: { id: parkingLotId } },
      relations: { parkingLot: true, spaces: true },
      order: { parkingLot: { id: 'ASC' }, floorNumber: 'ASC' },
    });
  }

  async findFloor(id: number): Promise<ParkingFloor> {
    const floor = await this.floorsRepository.findOne({
      where: { id },
      relations: { parkingLot: true, spaces: true },
    });
    if (!floor) {
      throw new NotFoundException('Piso no encontrado');
    }
    return floor;
  }

  async updateFloor(
    id: number,
    dto: UpdateParkingFloorDto,
  ): Promise<ParkingFloor> {
    this.rejectNullValues(dto);
    const floor = await this.findFloor(id);
    const lotId = dto.parkingLotId ?? floor.parkingLot.id;
    const parkingLot = await this.lotsRepository.findOneBy({ id: lotId });
    if (!parkingLot) {
      throw new NotFoundException('Estacionamiento no encontrado');
    }
    const floorNumber = dto.floorNumber ?? floor.floorNumber;
    await this.ensureFloorNumberAvailable(lotId, floorNumber, id);
    if (lotId !== floor.parkingLot.id) {
      const floorSpaceCount = await this.spacesRepository.count({
        where: { floor: { id } },
      });
      const destinationSpaceCount = await this.countSpacesInLot(lotId);
      if (destinationSpaceCount + floorSpaceCount > parkingLot.capacity) {
        throw new ConflictException(
          'Mover el piso superaría la capacidad del estacionamiento destino',
        );
      }
    }
    floor.floorNumber = floorNumber;
    floor.parkingLot = parkingLot;
    return this.floorsRepository.save(floor);
  }

  async removeFloor(id: number): Promise<void> {
    const floor = await this.floorsRepository.findOne({
      where: { id },
      relations: { spaces: { tickets: true, reservations: true } },
    });
    if (!floor) {
      throw new NotFoundException('Piso no encontrado');
    }
    if (floor.spaces.length) {
      throw new ConflictException(
        'No se puede eliminar un piso con espacios asociados',
      );
    }
    await this.floorsRepository.remove(floor);
  }

  async createSpace(dto: CreateParkingSpaceDto): Promise<ParkingSpace> {
    const floor = await this.floorsRepository.findOne({
      where: { id: dto.floorId },
      relations: { parkingLot: true },
    });
    if (!floor) {
      throw new NotFoundException('Piso no encontrado');
    }
    await this.ensureSpaceNumberAvailable(dto.spaceNumber, floor.id);
    await this.ensureLotHasCapacity(floor.parkingLot.id);
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
    this.rejectNullValues(dto);
    const space = await this.findSpace(id);
    const floorId = dto.floorId ?? space.floor.id;
    const floor = await this.floorsRepository.findOne({
      where: { id: floorId },
      relations: { parkingLot: true },
    });
    if (!floor) {
      throw new NotFoundException('Piso no encontrado');
    }
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
      await this.ensureLotHasCapacity(floor.parkingLot.id);
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

  private async countSpacesInLot(parkingLotId: number): Promise<number> {
    return this.spacesRepository
      .createQueryBuilder('space')
      .innerJoin('space.floor', 'floor')
      .where('floor.parking_lot_id = :parkingLotId', { parkingLotId })
      .getCount();
  }

  private async ensureLotHasCapacity(parkingLotId: number): Promise<void> {
    const lot = await this.lotsRepository.findOneBy({ id: parkingLotId });
    if (!lot) {
      throw new NotFoundException('Estacionamiento no encontrado');
    }
    if ((await this.countSpacesInLot(parkingLotId)) >= lot.capacity) {
      throw new ConflictException(
        'Se alcanzó la capacidad del estacionamiento',
      );
    }
  }

  private async ensureFloorNumberAvailable(
    parkingLotId: number,
    floorNumber: number,
    excludedId?: number,
  ): Promise<void> {
    const floor = await this.floorsRepository.findOne({
      where: { floorNumber, parkingLot: { id: parkingLotId } },
    });
    if (floor && floor.id !== excludedId) {
      throw new ConflictException(
        'El número de piso ya está registrado en este estacionamiento',
      );
    }
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

  private rejectNullValues(dto: object, nullableFields: string[] = []): void {
    const hasInvalidNull = Object.entries(dto).some(
      ([field, value]) => value === null && !nullableFields.includes(field),
    );
    if (hasInvalidNull) {
      throw new BadRequestException(
        'Los campos proporcionados no pueden ser null',
      );
    }
  }
}
