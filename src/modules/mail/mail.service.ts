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

  async sendTokenActivationEmail(
    mailData: MailData<{ hash: string; url: string }>,
  ): Promise<void> {
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

  async sendSubscriptionQrEmail(
    mailData: MailData<{
      name: string;
      spaceNumber: string;
      qrCode: string;
      startDate: Date | string;
      endDate: Date | string;
    }>,
  ): Promise<void> {
    const config = this.configService.getOrThrow<AppConfigType>('app', {
      infer: true,
    });

    const subject = '¡Tu espacio exclusivo 24/7 y Código QR - AutoPark UASD!';
    const qrImageUrl = `https://quickchart.io/qr?text=${encodeURIComponent(mailData.data.qrCode)}&size=200&margin=2`;
    const formattedStart = new Date(mailData.data.startDate).toLocaleDateString('es-DO');
    const formattedEnd = new Date(mailData.data.endDate).toLocaleDateString('es-DO');

    const templatePath = path.join(
      config.workingDirectory,
      'src',
      'modules',
      'mail',
      'mail-templates',
      'subscription-qr.hbs',
    );

    await this.mailerService.sendMail({
      to: mailData.to,
      subject,
      text: `Hola ${mailData.data.name}, tu espacio asignado es #${mailData.data.spaceNumber}. Código QR: ${mailData.data.qrCode}. Vigencia: ${formattedStart} al ${formattedEnd}.`,
      templatePath,
      context: {
        title: subject,
        app_name: this.configService.get('app.name', { infer: true }) || 'AutoPark UASD',
        name: mailData.data.name,
        spaceNumber: mailData.data.spaceNumber,
        qrCode: mailData.data.qrCode,
        qrImageUrl,
        startDate: formattedStart,
        endDate: formattedEnd,
      },
    });
  }

  async sendReservationEmail(
    mailData: MailData<{
      name: string;
      startTime: string;
      endTime: string;
      url: string;
      hash: string;
      parkingSpace: string;
      qrBuffer: Buffer;
    }>,
  ): Promise<void> {
    const config = this.configService.getOrThrow<AppConfigType>('app', {
      infer: true,
    });
    const templatePath = path.join(
      config.workingDirectory,
      'src',
      'modules',
      'mail',
      'mail-templates',
      'reservation.hbs',
    );

    await this.mailerService.sendMail({
      to: mailData.to,
      subject: '🎫 Reservación Confirmada - AutoPark UASD',
      templatePath: templatePath,
      context: {
        title: 'Reservación Confirmada',
        name: mailData.data.name,
        startTime: mailData.data.startTime,
        endTime: mailData.data.endTime,
        url: `${config.frontendDomain}/${mailData.data.url}`,
        hash: mailData.data.hash,
        parkingSpace: mailData.data.parkingSpace,
      },
      attachments: [
        {
          filename: 'qrcode.png',
          content: mailData.data.qrBuffer,
          contentType: 'image/png',
          contentDisposition: 'inline',
          cid: 'reservationQRCode',
        },
      ],
    });
  }
}