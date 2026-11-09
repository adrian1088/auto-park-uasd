import {
  Controller,
  Post,
  Body,
  Get,
  Res,
  UseGuards,
  Req,
  HttpStatus,
  HttpCode,
} from '@nestjs/common';
import { PasswordResetService } from './services/password-reset.service';
import { ConfigService } from '@nestjs/config';
import { LoginDto } from './dto/login.dto';
import { AuthService } from './services/auth.service';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from '../../shared/decorator/public.decorator';
import ms from 'ms';
import type { Request, Response } from 'express';
import {
  CurrentUser,
  CurrentUserType,
} from '../../shared/decorator/current-user.decorator';
import JwtRefreshGuard from './guards/jwt-refresh.guard';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RegisterDto } from './dto/register.dto';
import { ApiResponseType } from '../../shared/decorator/api-response-type.decorator';
import { CurrentUserDto } from './dto/current-user.dto';
import { ActivateAccountDto } from './dto/activate-account.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { ActivationService } from './services/activation.service';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  private readonly refreshSecret: string;
  private readonly refreshExpiresIn: string;
  private readonly accessSecret: string;
  private readonly accessExpiresIn: string;
  private readonly cookieAuthName: string;
  private readonly cookieRefreshName: string;

  constructor(
    private readonly authService: AuthService,
    private readonly activationService: ActivationService,
    private readonly passwordResetService: PasswordResetService,
    private readonly configService: ConfigService,
  ) {
    this.accessSecret = this.configService.getOrThrow<string>('jwt.secret');
    this.accessExpiresIn =
      this.configService.getOrThrow<string>('jwt.expiresIn');
    this.refreshSecret =
      this.configService.getOrThrow<string>('jwt.refreshSecret');
    this.refreshExpiresIn = this.configService.getOrThrow<string>(
      'jwt.refreshExpiresIn',
    );
    this.cookieAuthName =
      this.configService.getOrThrow<string>('jwt.cookieAuthName');
    this.cookieRefreshName = this.configService.getOrThrow<string>(
      'jwt.cookieRefreshName',
    );
  }

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Sign in with email or email and password',
    description:
      'Login with email or email and password, return access token and refresh token in cookie',
  })
  async login(
    @Body() dto: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const user = await this.authService.validateUser(dto.email, dto.password);
    const { accessToken, refreshToken } = await this.authService.login(user);
    this.setAuthCookies(res, accessToken, refreshToken);
    return { message: 'Signed in successfully' };
  }

  @Public()
  @Post('register')
  @ApiOperation({
    summary: 'Sign up a new user',
    description: 'Create a new user account and return the created user',
  })
  async register(@Body() dto: RegisterDto) {
    const user = await this.authService.register(dto);
    return user;
  }

  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Refresh access token using refresh token',
    description:
      'Refresh access token using refresh token stored in cookie, return new access token and refresh token in cookie',
  })
  @UseGuards(JwtRefreshGuard)
  async refresh(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { accessToken, refreshToken } = await this.authService.refreshTokens(
      req.cookies.Refresh,
    );
    this.setAuthCookies(res, accessToken, refreshToken);
    return { message: 'Tokens refreshed successfully' };
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: 'Get current user',
    description: "Return the currently authenticated user's information",
  })
  @ApiResponseType(CurrentUserDto)
  async me(@CurrentUser() user: CurrentUserType): Promise<CurrentUserDto> {
    return CurrentUserDto.fromCurrentUser(user);
  }

  @Public()
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Logout user',
    description:
      'Logout user by clearing auth cookies and invalidating refresh token',
  })
  async logout(
    @CurrentUser() user: CurrentUserType,
    @Res({ passthrough: true }) res: Response,
  ) {
    const userId = user?.id;
    const result = await this.authService.logout(userId);
    this.clearAuthCookies(res);
    return { message: 'Signed out successfully' };
  }

  @Public()
  @Post('activate')
  @ApiOperation({
    summary: 'Activate user account',
    description: 'Activate user account using the activation token',
  })
  async activate(@Body() dto: ActivateAccountDto) {
    return await this.activationService.activate(dto.token, dto.password);
  }

  @Public()
  @Post('forgot-password')
  @ApiOperation({
    summary: 'Request password reset',
    description: 'Send a password reset email to the user',
  })
  async forgotPassword(@Body() dto: ForgotPasswordDto) {
    return await this.passwordResetService.request(dto.email);
  }

  @Public()
  @Post('reset-password')
  @ApiOperation({
    summary: 'Reset password',
    description: 'Reset user password using the reset token',
  })
  async resetPassword(@Body() dto: ResetPasswordDto) {
    return this.passwordResetService.reset(dto);
  }

  private isProd() {
    return this.configService.get<string>('app.env') === 'production';
  }

  private cookieOpts(maxAgeMs: number) {
    return {
      httpOnly: true,
      path: '/',
      maxAge: Math.floor(maxAgeMs),
      secure: this.isProd(), // en local sin HTTPS debe ser false
      sameSite: this.isProd() ? ('strict' as const) : ('lax' as const),
    };
  }

  private setAuthCookies(
    res: Response,
    accessToken: string,
    refreshToken: string,
  ) {
    const accessMs = ms(this.accessExpiresIn as ms.StringValue);
    const refreshMs = ms(this.refreshExpiresIn as ms.StringValue);
    res.cookie(this.cookieAuthName, accessToken, this.cookieOpts(accessMs));
    res.cookie(
      this.cookieRefreshName,
      refreshToken,
      this.cookieOpts(refreshMs),
    );
  }

  private clearAuthCookies(res: Response) {
    res.cookie(this.cookieAuthName, '', { ...this.cookieOpts(0), maxAge: 0 });
    res.cookie(this.cookieRefreshName, '', {
      ...this.cookieOpts(0),
      maxAge: 0,
    });
  }
}
