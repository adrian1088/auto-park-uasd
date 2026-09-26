import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from "@nestjs/common";
import { Observable, tap } from "rxjs";
import { AuditService } from "../../modules/audit-logs/audit.service";

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  constructor(
    private readonly auditService: AuditService,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const req = context.switchToHttp().getRequest();
    const method: string = req.method.toUpperCase();
    const path: string = req.route?.path || req.url;
    const mutatingMethods = ['POST', 'PATCH', 'PUT', 'DELETE'];

    if (!mutatingMethods.includes(method)) return next.handle();

    const user = req.user;
    const action = `${method} ${path}`;
    const auditPayload = {
      userId: user?.id,
      action,
      payload: req.body,
      resource: this.extractResource(path),
      resourceId: req.params?.id || req.body?.id || '',
    };

    return next.handle().pipe(
      tap({
        next: data => {
            this.auditService
              .save({
                ...auditPayload,
                status: 'SUCCESS',
              })
              .catch(console.error);
        },
        error: err => {
            this.auditService
              .save({
                ...auditPayload,
                status: 'ERROR',
                errorMessage: err.message,
              })
              .catch(console.error);
        },
      }),
    );
  }

  private extractResource(path: string | undefined): string {
    if (!path) return '';
    const parts = path.split('/').filter(Boolean);
    return parts[0] || '';
  }
}
