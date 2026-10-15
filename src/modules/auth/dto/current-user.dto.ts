import { ApiResponseProperty } from '@nestjs/swagger';
import { UserStatus } from '../../users/enums/users-status.enum';
import { UserRole } from '../../users/enums/users-role.enum';
import { CurrentUserType } from '../../../shared/decorator/current-user.decorator';

export class CurrentUserDto {
  @ApiResponseProperty({ type: Number, example: 1 })
  id: number;

  @ApiResponseProperty({ type: String, example: 'user@example.com' })
  email: string;

  @ApiResponseProperty({ type: String, example: 'John Doe' })
  name: string;

  @ApiResponseProperty({ enum: UserRole, example: UserRole.USER })
  role: UserRole;

  @ApiResponseProperty({ enum: UserStatus, example: UserStatus.ACTIVE })
  status: UserStatus;

  static fromCurrentUser(user: CurrentUserType): CurrentUserDto {
    const dto = new CurrentUserDto();
    dto.id = user.id;
    dto.email = user.email;
    dto.name = user.name;
    dto.role = user.role;
    dto.status = user.status;
    return dto;
  }
}
