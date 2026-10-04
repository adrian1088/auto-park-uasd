import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { UserRole } from '../../users/enums/users-role.enum';

@Injectable()
export class AuditAdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();

    if (!request.user) {
      throw new UnauthorizedException();
    }

    if (request.user.role !== UserRole.ADMIN) {
      throw new ForbiddenException();
    }

    return true;
  }
}