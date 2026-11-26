import { Module } from '@nestjs/common';
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
import { SubscriptionsModule } from './modules/subscriptions/subscriptions.module';
import corsConfig from './config/cors.config';
// import { IdentityModule } from './modules/identity/identity.module';
import mailConfig from './config/mail.config';
import { MailModule } from './modules/mail/mail.module';
import { MailerModule } from './modules/mailer/mailer.module';
import { TokensModule } from './modules/tokens/tokens.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [
        appConfig,
        databaseConfig,
        jwtConfig,
        encryptConfig,
        corsConfig,
        mailConfig,
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
    // IdentityModule,
    MailerModule,
    MailModule,
    TokensModule,
    SubscriptionsModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
