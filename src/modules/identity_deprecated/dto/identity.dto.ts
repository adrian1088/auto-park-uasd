import { ApiResponseProperty, IntersectionType } from '@nestjs/swagger';
import { PaginationDto } from '../../../shared/dtos/pagination.dto';

export class IdentityDto {
  @ApiResponseProperty({ example: '123' })
  id: string;

  @ApiResponseProperty({ example: 'ana@example.com' })
  email: string;

  @ApiResponseProperty({ example: 'Ana' })
  name: string;

  @ApiResponseProperty({ example: '+1234567890' })
  phone: string;

  @ApiResponseProperty({ example: 'active' })
  status: string;
  
  @ApiResponseProperty({ example: '2024-06-01T12:00:00Z' })
  expiresAt?: Date;

  @ApiResponseProperty({ example: '2024-06-01T12:00:00Z' })
  acceptedAt?: Date;

  static fromEntity(entity: any): IdentityDto {
    const dto = new IdentityDto();
    dto.id = entity.id;
    dto.email = entity.email;
    dto.name = entity.name;
    dto.phone = entity.phone;
    dto.status = entity.status;
    dto.expiresAt = entity.expiresAt;
    dto.acceptedAt = entity.acceptedAt;
    return dto;
  }

  static fromEntities(entities: any[]): IdentityDto[] {
    return entities.map((entity) => IdentityDto.fromEntity(entity));
  }
}

export  class FilterIdentityDto {}
export class FilterIdentityPaginatedDto extends IntersectionType(
  FilterIdentityDto,
  PaginationDto,
) {}
