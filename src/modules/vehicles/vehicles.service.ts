import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserEntity } from '../users/entities/users.entity';
import { CreateVehicleDto } from './dto/create-vehicle.dto';
import { UpdateVehicleDto } from './dto/update-vehicle.dto';
import { VehicleEntity } from './entities/vehicle.entity';

@Injectable()
export class VehiclesService {
  constructor(
    @InjectRepository(VehicleEntity)
    private readonly vehiclesRepository: Repository<VehicleEntity>,
    @InjectRepository(UserEntity)
    private readonly usersRepository: Repository<UserEntity>,
  ) {}

  async create(createVehicleDto: CreateVehicleDto): Promise<VehicleEntity> {
    await this.ensurePlateAvailable(createVehicleDto.plateNumber);
    const vehicle = this.vehiclesRepository.create({
      plateNumber: createVehicleDto.plateNumber.trim().toUpperCase(),
      make: createVehicleDto.make,
      model: createVehicleDto.model,
      color: createVehicleDto.color,
      type: createVehicleDto.type,
      ownerName: createVehicleDto.ownerName,
    });
    return await this.vehiclesRepository.save(vehicle);
  }

  async findAll(): Promise<VehicleEntity[]> {
    return await this.vehiclesRepository.find({
      order: { id: 'DESC' },
    });
  }

  async findOne(id: number): Promise<VehicleEntity> {
    const vehicle = await this.vehiclesRepository.findOne({
      where: { id },
    });
    if (!vehicle) {
      throw new NotFoundException('Vehículo no encontrado');
    }
    return vehicle;
  }

  async update(id: number, updateVehicleDto: UpdateVehicleDto): Promise<VehicleEntity> {
    if (
      Object.entries(updateVehicleDto).some(
        ([field, value]) => value === null && field !== 'userId',
      )
    ) {
      throw new BadRequestException('Los campos del vehículo no pueden ser null');
    }
    const vehicle = await this.findEntity(id);
    if (updateVehicleDto.plateNumber) {
      const plateNumber = updateVehicleDto.plateNumber.trim().toUpperCase();
      await this.ensurePlateAvailable(plateNumber, id);
      vehicle.plateNumber = plateNumber;
    }

    const { userId, plateNumber: _plateNumber, ...fields } = updateVehicleDto;
    Object.assign(vehicle, fields);
    return await this.vehiclesRepository.save(vehicle);
  }

  async remove(id: number): Promise<void> {
    const vehicle = await this.vehiclesRepository.findOne({
      where: { id },
    });
    if (!vehicle) {
      throw new NotFoundException('Vehículo no encontrado');
    }
    await this.vehiclesRepository.remove(vehicle);
  }

  private async findEntity(id: number): Promise<VehicleEntity> {
    const vehicle = await this.vehiclesRepository.findOneBy({ id });
    if (!vehicle) {
      throw new NotFoundException('Vehículo no encontrado');
    }
    return vehicle;
  }

  private async findUser(id: number): Promise<UserEntity> {
    const user = await this.usersRepository.findOneBy({ id });
    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }
    return user;
  }

  private async ensurePlateAvailable(
    plateNumber: string,
    excludedId?: number,
  ): Promise<void> {
    const existing = await this.vehiclesRepository.findOneBy({
      plateNumber: plateNumber.trim().toUpperCase(),
    });
    if (existing && existing.id !== excludedId) {
      throw new ConflictException('La matrícula ya está registrada');
    }
  }
}
