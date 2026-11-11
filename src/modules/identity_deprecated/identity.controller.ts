import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Query,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { IdentityService } from './identity.service';
import { CreateInvitationRequestDto } from './dto/create-invitation-request.dto';
import {
  CurrentUser,
  CurrentUserType,
} from '../../shared/decorator/current-user.decorator';
import { Public } from '../../shared/decorator/public.decorator';
import { AcceptInvitationRequestDto } from './dto/accept-invitation.request.dto';
import { ApiResponseType } from '../../shared/decorator/api-response-type.decorator';
import { FilterIdentityPaginatedDto, IdentityDto } from './dto/identity.dto';
import { ResponsePaginatedDto } from '../../shared/dtos/response-paginated.dto';

@ApiTags('Identity Invitations')
// @ApiCookieAuth('cookieAuth')
@Controller('identity')
export class IdentityController {
  // constructor(private readonly identityService: IdentityService) {}

  // @Post('invitations')
  // @ApiOperation({ summary: 'Create a user invitation' })
  // @ApiResponseType(IdentityDto, { status: HttpStatus.CREATED })
  // async createInvitation(
  //   @Body() body: CreateInvitationRequestDto,
  //   @CurrentUser() user: CurrentUserType,
  // ): Promise<IdentityDto> {
  //   const invitation = await this.identityService.createInvitation({
  //     email: body.email,
  //     name: body.name,
  //     phone: body.phone,
  //     ttlHours: body.ttlHours,
  //     invitedByUserId: user.id,
  //   });

  //   return IdentityDto.fromEntity(invitation);
  // }

  // @Post('invitations/accept')
  // @Public()
  // @HttpCode(HttpStatus.OK)
  // @ApiOperation({ summary: 'Accept invitation token' })
  // @ApiResponseType(IdentityDto, { status: HttpStatus.CREATED })
  // async acceptInvitation(
  //   @Body() body: AcceptInvitationRequestDto,
  // ): Promise<IdentityDto> {
  //   const invitation = await this.identityService.acceptInvitation(
  //     body.token,
  //     body.password,
  //   );

  //   return IdentityDto.fromEntity(invitation);
  // }

  // @Get('invitations')
  // @ApiOperation({ summary: 'List invitations' })
  // @ApiResponseType(IdentityDto, {
  //   type: 'paginated',
  // })
  // async listInvitations(
  //   @Query() filter: FilterIdentityPaginatedDto,
  // ): Promise<ResponsePaginatedDto<IdentityDto>> {
  //   const { page, limit } = filter;
  //   const result = await this.identityService.listInvitations(page, limit);

  //   return ResponsePaginatedDto.fromDataAndMeta({
  //     data: result.invitations.map(IdentityDto.fromEntity),
  //     total: result.total,
  //     page,
  //     limit,
  //   });
  // }
}
