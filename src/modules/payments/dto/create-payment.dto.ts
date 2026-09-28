import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsDateString, IsEnum, IsInt, IsNumber, IsOptional, Min } from 'class-validator';
import { PaymentMethod } from '../enum/payment-method.enum';

export class CreatePaymentDto {
	@ApiProperty({ type: Number, minimum: 0.01, maximum: 99999999.99 })
	@Type(() => Number)
	@IsNumber({ maxDecimalPlaces: 2 })
	@Min(0.01)
	amount: number;

	@ApiPropertyOptional({ type: String, format: 'date-time' })
	@IsOptional()
	@IsDateString()
	paymentDate?: string;

	@ApiProperty({ enum: PaymentMethod })
	@IsEnum(PaymentMethod)
	paymentMethod: PaymentMethod;

	@ApiProperty({ type: Number, minimum: 1 })
	@Type(() => Number)
	@IsInt()
	@Min(1)
	userId: number;
}
