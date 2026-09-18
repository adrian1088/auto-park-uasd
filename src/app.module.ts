import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { UsersModule } from './modules/users/users.module';
import { SharedModule } from './shared/shared.module';
import appConfig from './config/app.config';
import databaseConfig from './config/database.config';
import { ConfigModule } from '@nestjs/config';
import { DatabaseModule } from './database/database.module';
import { VehiclesModule } from './modules/vehicles/vehicles.module';
import { AuthModule } from './modules/auth/auth.module';
import { TicketsModule } from './modules/tickets/tickets.module';
import { PaymentsModule } from './modules/payments/payments.module';
import { ParkingModule } from './modules/parking/parking.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [
        appConfig,
        databaseConfig,
        // authConfig,
        // mailConfig,
        // fileConfig,
      ],
      envFilePath: ['.env'],
    }),
    DatabaseModule,
    UsersModule,
    SharedModule,
    VehiclesModule,
    AuthModule,
    TicketsModule,
    PaymentsModule,
    ParkingModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
