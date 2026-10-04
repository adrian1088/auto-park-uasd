import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { UsersModule } from './modules/users/users.module';
import { SharedModule } from './shared/shared.module';
import appConfig from './config/app.config';
import databaseConfig from './config/database.config';
import { ConfigModule } from '@nestjs/config';
import jwtConfig from './config/jwt.config';
import encryptConfig from './config/encrypt.config';
import { DatabaseModule } from './database/database.module';
import { VehiclesModule } from './modules/vehicles/vehicles.module';
import { AuthModule } from './modules/auth/auth.module';
import { TicketsModule } from './modules/tickets/tickets.module';
import { PaymentsModule } from './modules/payments/payments.module';
import { ParkingModule } from './modules/parking/parking.module';
import { ReservationsModule } from './modules/reservations/reservations.module';
import { RatesModule } from './modules/rates/rates.module';
import { HealthModule } from './health/health.module';
import { JwtAuthGuard } from './modules/auth/guards/jwt-auth.guard';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [
        appConfig,
        databaseConfig,
        jwtConfig,
        encryptConfig,
        // authConfig,
        // mailConfig,
        // fileConfig,
      ],
      envFilePath: ['.env'],
    }),
    DatabaseModule,
    HealthModule,
    SharedModule,
    UsersModule,
    VehiclesModule,
    AuthModule,
    TicketsModule,
    PaymentsModule,
    ParkingModule,
    ReservationsModule,
    RatesModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
