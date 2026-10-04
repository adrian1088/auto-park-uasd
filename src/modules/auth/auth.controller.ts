import {
  Controller,
  Post,
  Body,
  UnauthorizedException,
  Get,
  Res,
  UseGuards,
  Req,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SignInDto } from './dto/sign-in.dto';
import { AuthService } from './auth.service';
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
import { SignUpDto } from './dto/sign-up.dto';

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
  @Post('sign-in')
  @ApiOperation({
    summary: 'Sign in with email or email and password',
    description:
      'Login with email or email and password, return access token and refresh token in cookie',
  })
  async signIn(
    @Body() dto: SignInDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const user = await this.authService.validateUser(dto.email, dto.password);
    const { accessToken, refreshToken } = await this.authService.signIn(user);
    this.setAuthCookies(res, accessToken, refreshToken);
    return { message: 'Login successful' };
  }

@Public()
@Post('sign-up')
@ApiOperation({
  summary: 'Sign up a new user',
  description: 'Create a new user account and return the created user',
})
async signUp(@Body() dto: SignUpDto) {
  const user = await this.authService.signUp(dto);
  return user;
}

  @Public()
  @Post('refresh')
  @ApiOperation({
    summary: 'Refresh access token using refresh token',
    description:
      'Refresh access token using refresh token stored in cookie, return new access token and refresh token in cookie',
  })
  @UseGuards(JwtRefreshGuard)
  async refresh(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
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
  async me(@CurrentUser() user: CurrentUserType) {
    return user;
  }

  @Public()
  @Post('sign-out')
  // @UseGuards(JwtRefreshGuard) // TODO: Eliminar
  @ApiOperation({
    summary: 'Logout user',
    description:
      'Logout user by clearing auth cookies and invalidating refresh token',
  })
  async signOut(
    @CurrentUser() user: CurrentUserType,
    @Res({ passthrough: true }) res: Response,
  ) {
    const userId = user?.id;
    const result = await this.authService.signOut(userId);
      this.clearAuthCookies(res);
    return result;
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
