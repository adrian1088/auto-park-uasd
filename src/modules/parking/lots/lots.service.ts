import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ILike, Repository } from 'typeorm';
import { rejectNullValues } from '../../../shared/utils/reject-null-values';
import { CreateParkingLotDto } from '../dto/create-parking-lot.dto';
import { FindParkingLotDto, FindParkingLotPaginatedDto } from '../dto/parking-lot.dto';
import { UpdateParkingLotDto } from '../dto/update-parking-lot.dto';
import { ParkingLot } from '../entities/parking-lot.entity';
import { ParkingSpace } from '../entities/parking-space.entity';

@Injectable()
export class LotsService {
  constructor(
    @InjectRepository(ParkingLot)
    private readonly lotsRepository: Repository<ParkingLot>,
    @InjectRepository(ParkingSpace)
    private readonly spacesRepository: Repository<ParkingSpace>,
  ) {}

  createLot(dto: CreateParkingLotDto): Promise<ParkingLot> {
    return this.lotsRepository.save(this.lotsRepository.create({ ...dto }));
  }

  async findAllLots(query: FindParkingLotDto): Promise<ParkingLot[]> {
    const { id, name, address, capacity } = query;
    const where = {
      ...(id !== undefined ? { id } : {}),
      ...(name !== undefined ? { name: ILike(`%${name}%`) } : {}),
      ...(address !== undefined ? { address: ILike(`%${address}%`) } : {}),
      ...(capacity !== undefined ? { capacity } : {}),
    };
    const lots = await this.lotsRepository.find({
      where,
      relations: { floors: { spaces: true }, rates: true },
      order: { id: 'DESC' },
    });
    return lots;
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

  async findLotBasic(id: number): Promise<ParkingLot> {
    const lot = await this.lotsRepository.findOneBy({ id });
    if (!lot) {
      throw new NotFoundException('Estacionamiento no encontrado');
    }
    return lot;
  }

  async findLotsPaginated({
    id,
    name,
    address,
    capacity,
    page,
    limit,
  }: FindParkingLotPaginatedDto): Promise<{ data: ParkingLot[]; total: number }> {
    const skip = (page - 1) * limit;
    const where = {
      ...(id !== undefined ? { id } : {}),
      ...(name !== undefined ? { name: ILike(`%${name}%`) } : {}),
      ...(address !== undefined ? { address: ILike(`%${address}%`) } : {}),
      ...(capacity !== undefined ? { capacity } : {}),
    };
    const [data, total] = await this.lotsRepository.findAndCount({
      where,
      relations: { floors: { spaces: true }, rates: true },
      order: { id: 'DESC' },
      skip,
      take: limit,
    });
    return { data, total };
  }

  async updateLot(id: number, dto: UpdateParkingLotDto): Promise<ParkingLot> {
    rejectNullValues(dto);
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

  async countSpacesInLot(lotId: number): Promise<number> {
    return this.spacesRepository
      .createQueryBuilder('space')
      .innerJoin('space.floor', 'floor')
      .where('floor.lot_id = :lotId', { lotId })
      .getCount();
  }

  async ensureLotHasCapacity(lotId: number): Promise<void> {
    const lot = await this.findLotBasic(lotId);
    if ((await this.countSpacesInLot(lotId)) >= lot.capacity) {
      throw new ConflictException(
        'Se alcanzó la capacidad del estacionamiento',
      );
    }
  }
}
