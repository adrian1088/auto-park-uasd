import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { SubscriptionStatus } from '../enum/subscription-status.enum';

export class CreateSubscriptionDto {
  @ApiPropertyOptional({ example: 'A123456, B987654' })
  @IsString()
  @IsOptional()
  plateNumbers?: string;

  @ApiProperty({ type: String, format: 'date-time' })
  @IsDateString()
  startDate: string;

  @ApiProperty({ type: String, format: 'date-time' })
  @IsDateString()
  endDate: string;

  @ApiPropertyOptional({
    enum: SubscriptionStatus,
    default: SubscriptionStatus.ACTIVE,
  })
  @IsOptional()
  @IsEnum(SubscriptionStatus)
  status?: SubscriptionStatus;

  @ApiProperty({ type: Number, minimum: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  userId: number;

  @ApiProperty({ type: Number, minimum: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  rateId: number;

  @ApiPropertyOptional({ type: Number, minimum: 1, nullable: true })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  parkingSpaceId?: number;
}