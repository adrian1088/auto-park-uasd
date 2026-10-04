import { Global, Module } from '@nestjs/common';
import { APP_FILTER, APP_INTERCEPTOR } from '@nestjs/core';
import { BaseEntity } from './base/base-entity';
import { HttpExceptionFilter } from './filters/http-exception.filter';
import { ResponseInterceptor } from './interceptors/response.interceptor';
import { LoggingInterceptor } from './interceptors/logging.interceptor';
import { AuditInterceptor } from './interceptors/audit.interceptor';
import { AuditLogsModule } from '../modules/audit-logs/audit.module';
import { EncryptModule } from './encrypt/encrypt.module';

@Global()
@Module({
  imports: [AuditLogsModule, EncryptModule],
  providers: [
    BaseEntity,
    // Global interceptors
    { provide: APP_INTERCEPTOR, useClass: AuditInterceptor },
    {
      provide: APP_INTERCEPTOR,
      useClass: LoggingInterceptor,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: ResponseInterceptor,
    },
    {
      provide: APP_FILTER,
      useClass: HttpExceptionFilter,
    },
  ],
  exports: [BaseEntity],
})
export class SharedModule {}
