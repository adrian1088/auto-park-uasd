import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../users/entities/users.entity';
import { CreateVehicleDto } from './dto/create-vehicle.dto';
import { UpdateVehicleDto } from './dto/update-vehicle.dto';
import { Vehicle } from './entities/vehicle.entity';

@Injectable()
export class VehiclesService {
  constructor(
    @InjectRepository(Vehicle)
    private readonly vehiclesRepository: Repository<Vehicle>,
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
  ) {}

  async create(createVehicleDto: CreateVehicleDto): Promise<Vehicle> {
    await this.ensurePlateAvailable(createVehicleDto.plateNumber);
    const user = createVehicleDto.userId
      ? await this.findUser(createVehicleDto.userId)
      : null;
    const vehicle = this.vehiclesRepository.create({
      plateNumber: createVehicleDto.plateNumber.trim().toUpperCase(),
      make: createVehicleDto.make,
      model: createVehicleDto.model,
      color: createVehicleDto.color,
      type: createVehicleDto.type,
      ownerName: createVehicleDto.ownerName,
      user: user ?? undefined,
    });
    return this.toSafeVehicle(await this.vehiclesRepository.save(vehicle));
  }

  async findAll(): Promise<Vehicle[]> {
    const vehicles = await this.vehiclesRepository.find({
      relations: { user: true },
      order: { id: 'DESC' },
    });
    return vehicles.map((vehicle) => this.toSafeVehicle(vehicle));
  }

  async findOne(id: number): Promise<Vehicle> {
    const vehicle = await this.vehiclesRepository.findOne({
      where: { id },
      relations: { user: true },
    });
    if (!vehicle) {
      throw new NotFoundException('Vehículo no encontrado');
    }
    return this.toSafeVehicle(vehicle);
  }

  async update(id: number, updateVehicleDto: UpdateVehicleDto): Promise<Vehicle> {
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
    if (userId !== undefined) {
      vehicle.user = userId === null ? null : await this.findUser(userId);
    }
    return this.toSafeVehicle(await this.vehiclesRepository.save(vehicle));
  }

  async remove(id: number): Promise<void> {
    const vehicle = await this.vehiclesRepository.findOne({
      where: { id },
      relations: { tickets: true, reservations: true },
    });
    if (!vehicle) {
      throw new NotFoundException('Vehículo no encontrado');
    }
    if (vehicle.tickets.length || vehicle.reservations.length) {
      throw new ConflictException(
        'No se puede eliminar un vehículo con tickets o reservas asociados',
      );
    }
    await this.vehiclesRepository.remove(vehicle);
  }

  private async findEntity(id: number): Promise<Vehicle> {
    const vehicle = await this.vehiclesRepository.findOneBy({ id });
    if (!vehicle) {
      throw new NotFoundException('Vehículo no encontrado');
    }
    return vehicle;
  }

  private async findUser(id: number): Promise<User> {
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

  private toSafeVehicle(vehicle: Vehicle): Vehicle {
    if (vehicle.user) {
      const { password: _password, ...publicUser } = vehicle.user;
      vehicle.user = publicUser as User;
    }
    return vehicle;
  }
}
