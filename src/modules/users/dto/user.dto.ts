import { ApiResponseProperty } from '@nestjs/swagger';
import { UsersStatus } from '../enums/users-status.enum';
import { UsersRole } from '../enums/users-role.enum';

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

  @ApiResponseProperty({ enum: UsersRole })
  role?: UsersRole;

  @ApiResponseProperty({ enum: UsersStatus })
  status?: UsersStatus;
}
