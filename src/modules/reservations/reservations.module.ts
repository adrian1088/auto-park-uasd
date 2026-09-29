import { Module } from '@nestjs/common';
import { ReservationsService } from './reservations.service';
import { ReservationsController } from './reservations.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Reservation } from './entities/reservation.entity';
import { User } from '../users/entities/users.entity';
import { ParkingSpace } from '../parking/entities/parking-space.entity';
import { Vehicle } from '../vehicles/entities/vehicle.entity';
import { Ticket } from '../tickets/entities/ticket.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Reservation, User, ParkingSpace, Vehicle, Ticket])],
  controllers: [ReservationsController],
  providers: [ReservationsService],
})
export class ReservationsModule {}
