import { Global, Logger, Module } from '@nestjs/common';
import { Clock, ContentChangeNotifier, PasswordHasher } from '../../domain/ports';
import { EnvService } from '../config/env.service';
import { MailModule } from '../mail/mail.module';
import { Argon2PasswordHasher } from '../security/argon2.hasher';
import { StorageModule } from '../storage/storage.module';
import { HttpRevalidationNotifier, NoopNotifier } from './revalidation.notifier';
import { SystemClock } from './system.clock';

/** Cross-cutting adapters available to every feature module. */
@Global()
@Module({
  imports: [MailModule, StorageModule],
  providers: [
    { provide: Clock, useClass: SystemClock },
    { provide: PasswordHasher, useClass: Argon2PasswordHasher },
    {
      provide: ContentChangeNotifier,
      inject: [EnvService],
      useFactory: (env: EnvService) => {
        const url = env.get('WEB_REVALIDATE_URL');
        const secret = env.get('REVALIDATE_SECRET');
        return url && secret ? new HttpRevalidationNotifier(url, secret, new Logger('Revalidation')) : new NoopNotifier();
      },
    },
  ],
  exports: [Clock, PasswordHasher, ContentChangeNotifier, MailModule, StorageModule],
})
export class ServicesModule {}
