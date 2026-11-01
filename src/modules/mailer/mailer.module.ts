import { Module } from '@nestjs/common';
import { MailerService } from './mailer.service';

@Module({
  imports: [],
  providers: [MailerService],
  controllers: [],
  exports: [MailerService],
})
export class MailerModule {}
