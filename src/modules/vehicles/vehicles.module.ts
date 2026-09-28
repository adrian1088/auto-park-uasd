import { Module } from '@nestjs/common';
import { VehiclesService } from './vehicles.service';
import { VehiclesController } from './vehicles.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Vehicle } from './entities/vehicle.entity';
import { User } from '../users/entities/users.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Vehicle, User])],
  controllers: [VehiclesController],
  providers: [VehiclesService],
})
export class VehiclesModule {}
