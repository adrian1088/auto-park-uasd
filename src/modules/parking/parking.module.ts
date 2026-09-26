import { Module } from '@nestjs/common';
import { ParkingService } from './parking.service';
import { ParkingController } from './parking.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ParkingLot } from './entities/parking-lot.entity';
import { ParkingFloor } from './entities/parking-floor.entity';
import { ParkingSpace } from './entities/parking-space.entity';

@Module({
  imports: [TypeOrmModule.forFeature([ParkingLot, ParkingFloor, ParkingSpace])],
  controllers: [ParkingController],
  providers: [ParkingService],
})
export class ParkingModule {}
