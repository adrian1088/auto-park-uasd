import { Module } from '@nestjs/common';
import { VehiclesService } from './vehicles.service';
import { VehiclesController } from './vehicles.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { VehicleEntity } from './entities/vehicle.entity';
import { UserEntity } from '../users/entities/users.entity';

@Module({
  imports: [TypeOrmModule.forFeature([VehicleEntity, UserEntity])],
  controllers: [VehiclesController],
  providers: [VehiclesService],
})
export class VehiclesModule {}
