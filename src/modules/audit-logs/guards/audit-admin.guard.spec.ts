import {
  ExecutionContext,
  ForbiddenException,
  UnauthorizedException,
} from '@nestjs/common';
import { UsersRole } from '../../../modules/users/enums/users-role.enum';
import { AuditAdminGuard } from './audit-admin.guard';

describe('AuditAdminGuard', () => {
  const guard = new AuditAdminGuard();

  const contextFor = (user?: { role: string }): ExecutionContext =>
    ({
      switchToHttp: () => ({ getRequest: () => ({ user }) }),
    }) as unknown as ExecutionContext;

  it('rejects requests without an authenticated user', () => {
    expect(() => guard.canActivate(contextFor())).toThrow(UnauthorizedException);
  });

  it('rejects authenticated non-admin users', () => {
    expect(() => guard.canActivate(contextFor({ role: UsersRole.USER }))).toThrow(
      ForbiddenException,
    );
  });

  it('allows administrators', () => {
    expect(guard.canActivate(contextFor({ role: UsersRole.ADMIN }))).toBe(true);
  });
});