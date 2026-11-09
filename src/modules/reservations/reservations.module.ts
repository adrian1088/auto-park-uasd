import { Module } from '@nestjs/common';
import { ReservationsService } from './reservations.service';
import { ReservationsController } from './reservations.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ReservationEntity } from './entities/reservation.entity';
import { UserEntity } from '../users/entities/users.entity';
import { ParkingSpace } from '../parking/entities/parking-space.entity';
import { VehicleEntity } from '../vehicles/entities/vehicle.entity';
import { TicketEntity } from '../tickets/entities/ticket.entity';

@Module({
  imports: [TypeOrmModule.forFeature([ReservationEntity, UserEntity, ParkingSpace, VehicleEntity, TicketEntity])],
  controllers: [ReservationsController],
  providers: [ReservationsService],
})
export class ReservationsModule {}
