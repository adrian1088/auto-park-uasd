import { Injectable } from '@nestjs/common';
import { MailerService } from '../mailer/mailer.service';
import { ConfigService } from '@nestjs/config';
import path from 'path';
import { MailData } from './interfaces/mail-data.interface';
import { AppConfigType } from '../../config/app-config.type';

@Injectable()
export class MailService {
  constructor(
    private readonly mailerService: MailerService,
    private readonly configService: ConfigService,
  ) {}

  async sendTokenActivationEmail(mailData: MailData<{ hash: string, url: string }>): Promise<void> {
    const config = this.configService.getOrThrow<AppConfigType>('app', {
      infer: true,
    });
    let emailConfirmTitle: string = 'Confirmar correo electrónico';
    let text1: string = '¡Hola!';
    let text2: string =
      'Ya casi estás listo para empezar a disfrutar de nuestra aplicación';
    let text3: string =
      'Simplemente haz clic en el botón verde de abajo para verificar tu dirección de correo electrónico.';

    const url = new URL(`${config.frontendDomain}/${mailData.data.url}`);
    url.searchParams.set('hash', mailData.data.hash);
    const templatePath = path.join(
      config.workingDirectory,
      'src',
      'modules',
      'mail',
      'mail-templates',
      'account-activation.hbs',
    );

    await this.mailerService.sendMail({
      to: mailData.to,
      subject: emailConfirmTitle,
      text: `${url.toString()} ${emailConfirmTitle}`,
      templatePath: templatePath,
      context: {
        title: emailConfirmTitle,
        url: url.toString(),
        actionTitle: emailConfirmTitle,
        app_name: this.configService.get('app.name', { infer: true }),
        text1,
        text2,
        text3,
      },
    });
  }

  async sendTokenResetPasswordEmail(
    mailData: MailData<{ hash: string; tokenExpires: number }>,
  ): Promise<void> {
    const config = this.configService.getOrThrow<AppConfigType>('app', {
      infer: true,
    });
    let resetPasswordTitle: string = 'Restablecer contraseña';
    let text1: string = '¿Problemas para iniciar sesión?';
    let text2: string = 'Restablecer tu contraseña es fácil.';
    let text3: string =
      'Simplemente presiona el botón de abajo y sigue las instrucciones. Estarás listo en poco tiempo.';
    let text4: string =
      'Si no realizaste esta solicitud, por favor ignora este correo electrónico.';

    const url = new URL(`${config.frontendDomain}/password-change`);
    url.searchParams.set('hash', mailData.data.hash);
    url.searchParams.set('expires', mailData.data.tokenExpires.toString());
    const templatePath = path.join(
      config.workingDirectory,
      'src',
      'modules',
      'mail',
      'mail-templates',
      'password-reset.hbs',
    );
    await this.mailerService.sendMail({
      to: mailData.to,
      subject: resetPasswordTitle,
      text: `${url.toString()} ${resetPasswordTitle}`,
      templatePath: templatePath,
      context: {
        title: resetPasswordTitle,
        url: url.toString(),
        actionTitle: resetPasswordTitle,
        app_name: this.configService.get('app.name', {
          infer: true,
        }),
        text1,
        text2,
        text3,
        text4,
      },
    });
  }
}
