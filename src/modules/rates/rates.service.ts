import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, SelectQueryBuilder } from 'typeorm';
import { ParkingLot } from '../parking/entities/parking-lot.entity';
import { CreateRateDto } from './dto/create-rate.dto';
import { UpdateRateDto } from './dto/update-rate.dto';
import { Rate } from './entities/rate.entity';
import { RateType } from './enum/rate-type.enum';

@Injectable()
export class RatesService {
  constructor(
    @InjectRepository(Rate)
    private readonly ratesRepository: Repository<Rate>,
    @InjectRepository(ParkingLot)
    private readonly parkingLotsRepository: Repository<ParkingLot>,
  ) {}

  async create(createRateDto: CreateRateDto): Promise<Rate> {
    const parkingLot = await this.parkingLotsRepository.findOneBy({
      id: createRateDto.parkingLotId,
    });
    if (!parkingLot) {
      throw new NotFoundException('Estacionamiento no encontrado');
    }

    const rate = this.ratesRepository.create({
      type: createRateDto.type,
      amount: Number(createRateDto.amount.toFixed(2)),
      validFrom: new Date(createRateDto.validFrom),
      validTo: createRateDto.validTo ? new Date(createRateDto.validTo) : null,
      isActive: true,
      parkingLot,
    });
    this.validatePeriod(rate.validFrom, rate.validTo);
    await this.ensureNoOverlap(rate);
    return this.ratesRepository.save(rate);
  }

  findAll(parkingLotId?: number, type?: RateType): Promise<Rate[]> {
    if (parkingLotId !== undefined && (!Number.isInteger(parkingLotId) || parkingLotId < 1)) {
      throw new BadRequestException('parkingLotId must be a positive integer');
    }
    const query = this.ratesRepository
      .createQueryBuilder('rate')
      .leftJoinAndSelect('rate.parkingLot', 'parkingLot')
      .orderBy('rate.validFrom', 'DESC');

    if (parkingLotId !== undefined) {
      query.andWhere('parkingLot.id = :parkingLotId', { parkingLotId });
    }
    if (type !== undefined) {
      this.validateType(type);
      query.andWhere('rate.type = :type', { type });
    }
    return query.getMany();
  }

  async findOne(id: number): Promise<Rate> {
    const rate = await this.ratesRepository.findOne({
      where: { id },
      relations: { parkingLot: true },
    });
    if (!rate) {
      throw new NotFoundException('Tarifa no encontrada');
    }
    return rate;
  }

  async findCurrent(parkingLotId: number, type: RateType): Promise<Rate> {
    if (!Number.isInteger(parkingLotId) || parkingLotId < 1) {
      throw new BadRequestException('El ID del estacionamiento debe ser un número entero positivo');
    }
    this.validateType(type);
    const now = new Date();
    const rate = await this.ratesRepository
      .createQueryBuilder('rate')
      .leftJoinAndSelect('rate.parkingLot', 'parkingLot')
      .where('parkingLot.id = :parkingLotId', { parkingLotId })
      .andWhere('rate.type = :type', { type })
      .andWhere('rate.is_active = true')
      .andWhere('rate.valid_from <= :now', { now })
      .andWhere('(rate.valid_to IS NULL OR rate.valid_to > :now)', { now })
      .getOne();

    if (!rate) {
      throw new NotFoundException('No se encontró una tarifa vigente para este estacionamiento y tipo');
    }
    return rate;
  }

  async update(id: number, updateRateDto: UpdateRateDto): Promise<Rate> {
    const rate = await this.findOne(id);
    const parkingLotId = updateRateDto.parkingLotId ?? rate.parkingLot.id;
    const parkingLot = await this.parkingLotsRepository.findOneBy({ id: parkingLotId });
    if (!parkingLot) {
      throw new NotFoundException('Estacionamiento no encontrado');
    }

    rate.type = updateRateDto.type ?? rate.type;
    rate.amount = Number(updateRateDto.amount?.toFixed(2)) ?? rate.amount;
    rate.validFrom = updateRateDto.validFrom
      ? new Date(updateRateDto.validFrom)
      : rate.validFrom;
    rate.validTo = updateRateDto.validTo === undefined
      ? rate.validTo
      : updateRateDto.validTo
        ? new Date(updateRateDto.validTo)
        : null;
    rate.parkingLot = parkingLot;

    this.validatePeriod(rate.validFrom, rate.validTo);
    await this.ensureNoOverlap(rate, id);
    return this.ratesRepository.save(rate);
  }

  async remove(id: number): Promise<void> {
    const rate = await this.findOne(id);
    rate.isActive = false;
    await this.ratesRepository.save(rate);
  }

  private validatePeriod(validFrom: Date, validTo: Date | null): void {
    if (Number.isNaN(validFrom.getTime()) || (validTo && Number.isNaN(validTo.getTime()))) {
      throw new BadRequestException('Las fechas de validez de la tarifa son inválidas');
    }
    if (validTo && validTo <= validFrom) {
      throw new BadRequestException('La fecha de fin de validez debe ser posterior a la fecha de inicio de validez');
    }
  }

  private validateType(type: RateType): void {
    if (!Object.values(RateType).includes(type)) {
      throw new BadRequestException('El tipo de tarifa es inválido');
    }
  }

  private async ensureNoOverlap(rate: Rate, excludedId?: number): Promise<void> {
    const query = this.ratesRepository
      .createQueryBuilder('existing')
      .where('existing.parking_lot_id = :parkingLotId', {
        parkingLotId: rate.parkingLot.id,
      })
      .andWhere('existing.is_active = true')
      .andWhere('existing.type = :type', { type: rate.type })
      .andWhere('existing.valid_from < COALESCE(:validTo, \'infinity\'::timestamp)', {
        validTo: rate.validTo,
      })
      .andWhere('(existing.valid_to IS NULL OR existing.valid_to > :validFrom)', {
        validFrom: rate.validFrom,
      });

    if (excludedId !== undefined) {
      query.andWhere('existing.id != :excludedId', { excludedId });
    }
    await this.throwIfOverlap(query);
  }

  private async throwIfOverlap(query: SelectQueryBuilder<Rate>): Promise<void> {
    if (await query.getExists()) {
      throw new ConflictException('Los periodos de validez de la tarifa no pueden superponerse para el mismo estacionamiento y tipo');
    }
  }
}