import { CallHandler, ExecutionContext } from '@nestjs/common';
import { of, throwError } from 'rxjs';
import { AuditConfigService } from '../../modules/audit-logs/audit-config.service';
import { AuditService } from '../../modules/audit-logs/audit.service';
import { AuditInterceptor } from './audit.interceptor';

describe('AuditInterceptor', () => {
  let interceptor: AuditInterceptor;
  let auditService: { save: jest.Mock };
  let auditConfig: {
    isEnabled: jest.Mock;
    allowsEntity: jest.Mock;
    allowsEvent: jest.Mock;
  };

  beforeEach(() => {
    auditService = { save: jest.fn().mockResolvedValue(undefined) };
    auditConfig = {
      isEnabled: jest.fn().mockReturnValue(true),
      allowsEntity: jest.fn().mockReturnValue(true),
      allowsEvent: jest.fn().mockReturnValue(true),
    };
    interceptor = new AuditInterceptor(
      auditService as unknown as AuditService,
      auditConfig as unknown as AuditConfigService,
    );
  });

  it('redacts secrets and preserves actor and route ID on success', () => {
    const request = {
      method: 'POST',
      route: { path: '/users/:id' },
      params: { id: '17' },
      body: { password: 'do-not-store', profile: { access_token: 'secret' } },
      user: { id: 4 },
    };
    const context = {
      switchToHttp: () => ({ getRequest: () => request }),
    } as unknown as ExecutionContext;
    const next = { handle: () => of({ data: { message: 'updated' } }) } as CallHandler;

    interceptor.intercept(context, next).subscribe();

    expect(auditService.save).toHaveBeenCalledWith(
      expect.objectContaining({
        user: { id: 4 },
        resource: 'users',
        resourceId: '17',
        status: 'SUCCESS',
        payload: {
          password: '[REDACTED]',
          profile: { access_token: '[REDACTED]' },
        },
      }),
    );
  });

  it('records a safe error and skips non-mutating requests', () => {
    const request = {
      method: 'PATCH',
      route: { path: '/users/:id' },
      params: { id: '17' },
      body: {},
      user: { sub: 4 },
    };
    const context = {
      switchToHttp: () => ({ getRequest: () => request }),
    } as unknown as ExecutionContext;
    const next = {
      handle: () => throwError(() => new Error('sensitive database detail')),
    } as CallHandler;

    interceptor.intercept(context, next).subscribe({ error: () => undefined });

    expect(auditService.save).toHaveBeenCalledWith(
      expect.objectContaining({
        user: { id: 4 },
        resourceId: '17',
        status: 'ERROR',
        errorMessage: 'Request failed',
      }),
    );

    request.method = 'GET';
    interceptor.intercept(context, { handle: () => of({}) } as CallHandler).subscribe();
    expect(auditService.save).toHaveBeenCalledTimes(1);
  });

  it('does not retain authentication request bodies', () => {
    const request = {
      method: 'POST',
      route: { path: '/auth/sign-in' },
      params: {},
      body: { email: 'person@example.com', password: 'do-not-store' },
      user: undefined,
    };
    const context = {
      switchToHttp: () => ({ getRequest: () => request }),
    } as unknown as ExecutionContext;

    interceptor.intercept(context, { handle: () => of({}) } as CallHandler).subscribe();

    expect(auditService.save).toHaveBeenCalledWith(
      expect.objectContaining({ payload: null }),
    );
  });
});