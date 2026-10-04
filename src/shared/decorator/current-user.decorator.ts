import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { UserRole } from '../../modules/users/enums/users-role.enum';
import { UserStatus } from '../../modules/users/enums/users-status.enum';

export type CurrentUserType = {
  id: number;
  email?: string;
  name: string;
  role?: UserRole;
  status?: UserStatus;
};

export const CurrentUser = createParamDecorator((data: string, ctx: ExecutionContext) => {
  const request = ctx.switchToHttp().getRequest();
  const user = request.user;
  return data ? user?.[data] : getCurrentUser(request);
});

function getCurrentUser(request: any): CurrentUserType {
  const user = request.user;
  if (!user) {
    return {
      id: 0,
      name: 'Anonymous User',
      email: 'anonymous@domain.com',
      role: 'guest' as UserRole,
      status: UserStatus.INACTIVE,
    };
  } else {
    return user as CurrentUserType;
  }
}
