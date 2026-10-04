import { ApiResponseProperty } from '@nestjs/swagger';
import { UserStatus } from '../enums/users-status.enum';
import { UserRole } from '../enums/users-role.enum';

export class UserDto {
  @ApiResponseProperty({ example: 1 })
  id: number;

  @ApiResponseProperty({ type: Date })
  createdAt: Date;

  @ApiResponseProperty({ type: Date })
  updatedAt: Date;

  @ApiResponseProperty({ example: 'Ana Pérez' })
  name: string;

  @ApiResponseProperty({ example: 'ana@example.com' })
  email: string;

  @ApiResponseProperty({ example: '809-555-0101' })
  phone: string;

  @ApiResponseProperty({ enum: UserRole })
  role?: UserRole;

  @ApiResponseProperty({ enum: UserStatus })
  status?: UserStatus;
}
