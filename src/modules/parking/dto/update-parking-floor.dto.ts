import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, Min } from 'class-validator';
import { PartialType } from '@nestjs/swagger';
import { CreateParkingFloorDto } from './create-parking-floor.dto';

export class UpdateParkingFloorDto extends PartialType(CreateParkingFloorDto) {}