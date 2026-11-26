import {
  CallHandler,
  ExecutionContext,
  Injectable,
  Logger,
  NestInterceptor,
} from '@nestjs/common';
import { Observable, tap } from 'rxjs';
import { AuditConfigService } from '../../modules/audit-logs/audit-config.service';
import { AuditService } from '../../modules/audit-logs/audit.service';
import { AuditLog } from '../../modules/audit-logs/entities/audit-log.entity';
import { UserEntity } from '../../modules/users/entities/users.entity';
import {
  isAuthenticationRoute,
  sanitizeSensitiveData,
} from '../utils/sanitize-sensitive-data';

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  private readonly logger = new Logger(AuditInterceptor.name);

  constructor(
    private readonly auditService: AuditService,
    private readonly auditConfig: AuditConfigService,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const req = context.switchToHttp().getRequest();
    const method: string = req.method.toUpperCase();
    const path: string =
      req.route?.path || req.path || req.url?.split('?')[0] || '';
    const mutatingMethods = ['POST', 'PATCH', 'PUT', 'DELETE'];
    const resource = this.extractResource(path);

    if (
      !this.auditConfig.isEnabled() ||
      !mutatingMethods.includes(method) ||
      !this.auditConfig.allowsEvent(method) ||
      !this.auditConfig.allowsEntity(resource)
    ) {
      return next.handle();
    }

    const user = req.user;
    const userId = user?.id ?? user?.sub;
    const action = `${method} ${path}`;
    const auditPayload: Partial<AuditLog> = {
      user: userId == null ? undefined : ({ id: userId } as UserEntity),
      action,
      payload: isAuthenticationRoute(path)
        ? null
        : (sanitizeSensitiveData(req.body) as Record<string, unknown> | null),
      resource,
      resourceId: this.toResourceId(req.params?.id ?? req.body?.id),
    };

    return next.handle().pipe(
      tap({
        next: (data: any) => {
          const resourceId =
            data?.data?.id ?? data?.id ?? auditPayload.resourceId;
          this.save({
            ...auditPayload,
            resourceId: this.toResourceId(resourceId),
            status: 'SUCCESS',
          });
        },
        error: (error: any) => {
          this.save({
            ...auditPayload,
            status: 'ERROR',
            errorMessage: this.toSafeErrorMessage(error),
          });
        },
      }),
    );
  }

  private extractResource(path: string): string {
    const segments = path.split('/').filter(Boolean);
    return (
      segments.find(
        (segment) =>
          segment !== 'api' &&
          !/^v\d+$/i.test(segment) &&
          !segment.startsWith(':'),
      ) ?? ''
    );
  }

  private toResourceId(value: unknown): string | null {
    return value == null ? null : String(value);
  }

  //Capturar mas data en los bugs
  //---------------------------------------
  private toSafeErrorMessage(error: any): string {
    if (!error) {
      return 'Unknown error';
    }

    // Si es una HttpException de NestJS, podemos extraer su respuesta o mensaje real
    if (typeof error.getResponse === 'function') {
      const response = error.getResponse();
      if (typeof response === 'string') {
        return response;
      }
      if (
        typeof response === 'object' &&
        response !== null &&
        'message' in response
      ) {
        const msg = (response as any).message;
        return Array.isArray(msg) ? msg.join(', ') : String(msg);
      }
    }

    // Si es un error estándar de JavaScript/TypeScript, devolvemos su mensaje descriptivo
    return error.message || 'Request failed';
  }

  private save(data: Partial<AuditLog>): void {
    void this.auditService.save(data).catch(() => {
      this.logger.error('Failed to persist audit log entry');
    });
  }
}
