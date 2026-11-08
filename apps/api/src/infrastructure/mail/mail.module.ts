import { Module } from '@nestjs/common';
import { MailService } from '../../domain/ports';
import { EnvService } from '../config/env.service';
import { LogMailService } from './log.mail';
import { NodemailerMailService } from './nodemailer.mail';
import { ResendMailService } from './resend.mail';

/** Picks the mail adapter from MAIL_DRIVER. Required keys are guaranteed by env.schema.ts. */
@Module({
  providers: [
    {
      provide: MailService,
      inject: [EnvService],
      useFactory: (env: EnvService): MailService => {
        switch (env.get('MAIL_DRIVER')) {
          case 'resend':
            return new ResendMailService(env.get('RESEND_API_KEY')!, env.get('MAIL_FROM'));
          case 'smtp':
            return new NodemailerMailService({
              host: env.get('SMTP_HOST')!,
              port: env.get('SMTP_PORT'),
              secure: env.get('SMTP_SECURE'),
              user: env.get('SMTP_USER'),
              pass: env.get('SMTP_PASS'),
              from: env.get('MAIL_FROM'),
            });
          case 'log':
            return new LogMailService();
        }
      },
    },
  ],
  exports: [MailService],
})
export class MailModule {}
