import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { rejectNullValues } from '../../../shared/utils/reject-null-values';
import { CreateParkingFloorDto } from '../dto/create-parking-floor.dto';
import { UpdateParkingFloorDto } from '../dto/update-parking-floor.dto';
import { ParkingFloor } from '../entities/parking-floor.entity';
import { ParkingSpace } from '../entities/parking-space.entity';
import { ParkingFloorStatus } from '../enum/parking-floor-status.enum';
import { LotsService } from '../lots/lots.service';
import { FindParkingFloorsDto } from './dto/parking-floor.dto';

@Injectable()
export class FloorsService {
  constructor(
    @InjectRepository(ParkingFloor)
    private readonly floorsRepository: Repository<ParkingFloor>,
    @InjectRepository(ParkingSpace)
    private readonly spacesRepository: Repository<ParkingSpace>,
    private readonly lotsService: LotsService,
  ) {}

  async createFloor(dto: CreateParkingFloorDto): Promise<ParkingFloor> {
    const parkingLot = await this.lotsService.findLotBasic(dto.lotId);
    await this.ensureFloorNumberAvailable(parkingLot.id, dto.floorNumber);
    return await this.floorsRepository.save(
      await this.floorsRepository.create({
        floorNumber: dto.floorNumber,
        status: ParkingFloorStatus.OPEN,
        lot: parkingLot,
      }),
    );
  }

  async findAllFloors(lotId?: number): Promise<ParkingFloor[]> {
    const floors = await this.floorsRepository.find({
      where:
        lotId === undefined ? {} : { lot: { id: lotId } },
      relations: { lot: true, spaces: true },
      order: { lot: { id: 'ASC' }, floorNumber: 'ASC' },
    });
    return floors;
  }

  async findFloorsPaginated({
    lotId,
    floorNumber,
    page,
    limit,
  }: FindParkingFloorsDto): Promise<{ data: ParkingFloor[]; total: number}> {
    const skip = (page - 1) * limit;
    const take = limit;
    const where = {
      ...(lotId === undefined ? {} : { lot: { id: lotId } }),
      ...(floorNumber === undefined ? {} : { floorNumber }),
    };
    const [data, total] = await this.floorsRepository.findAndCount({
      where,
      relations: { lot: true, spaces: true },
      order: { lot: { id: 'ASC' }, floorNumber: 'ASC' },
      skip,
      take,
    });
    return { data, total };
  }

  async findFloor(id: number): Promise<ParkingFloor> {
    const floor = await this.floorsRepository.findOne({
      where: { id },
      relations: { lot: true, spaces: true },
    });
    if (!floor) {
      throw new NotFoundException('Piso no encontrado');
    }
    return floor;
  }

  async findFloorWithLot(id: number): Promise<ParkingFloor> {
    const floor = await this.floorsRepository.findOne({
      where: { id },
      relations: { lot: true },
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
    rejectNullValues(dto);
    const floor = await this.findFloor(id);
    const lotId = dto.lotId ?? floor.lot.id;
    const parkingLot = await this.lotsService.findLotBasic(lotId);
    const floorNumber = dto.floorNumber ?? floor.floorNumber;
    await this.ensureFloorNumberAvailable(lotId, floorNumber, id);
    if (lotId !== floor.lot.id) {
      const floorSpaceCount = await this.spacesRepository.count({
        where: { floor: { id } },
      });
      const destinationSpaceCount =
        await this.lotsService.countSpacesInLot(lotId);
      if (destinationSpaceCount + floorSpaceCount > parkingLot.capacity) {
        throw new ConflictException(
          'Mover el piso superaría la capacidad del estacionamiento destino',
        );
      }
    }
    floor.floorNumber = floorNumber;
    floor.lot = parkingLot;
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

  private async ensureFloorNumberAvailable(
    parkingLotId: number,
    floorNumber: number,
    excludedId?: number,
  ): Promise<void> {
    const floor = await this.floorsRepository.findOne({
      where: { floorNumber, lot: { id: parkingLotId } },
    });
    if (floor && floor.id !== excludedId) {
      throw new ConflictException(
        'El número de piso ya está registrado en este estacionamiento',
      );
    }
  }
}
