import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { AuthService } from '../auth.service';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';
import { UserStatus } from '../../users/enums/users-status.enum';

interface RefreshPayload {
  sub: number;
  email: string;
  tokenVersion?: number;
}

@Injectable()
export class JwtRefreshStrategy extends PassportStrategy(
  Strategy,
  'jwt-refresh',
) {
  private cookieRefreshName: string;
  constructor(
    private readonly configService: ConfigService,
    private readonly authService: AuthService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        (req) => {
          this.cookieRefreshName = configService.getOrThrow(
            'jwt.cookieRefreshName',
          );
          return req.cookies?.[this.cookieRefreshName];
        },
      ]), // extrae el token de la cookie 'Refresh'
      passReqToCallback: true, // Necesario para leer la cookie en validate
      ignoreExpiration: false, // falso para que se verifique la expiración del token
      secretOrKey: configService.getOrThrow('jwt.refreshSecret'), // clave secreta para verificar el token de actualización
    });
  }

  async validate(req: Request, payload: RefreshPayload) {
    const token = req.cookies?.[this.cookieRefreshName];
    if (!token) {
      throw new UnauthorizedException('Token de actualización faltante');
    }
    const user = await this.authService.findUserAuthById(payload.sub);

    const userStatus = user?.status as UserStatus;
    if (!user || userStatus === UserStatus.INACTIVE) {
      throw new UnauthorizedException('Credenciales inválidas');
    }
    return user;
  }
}
