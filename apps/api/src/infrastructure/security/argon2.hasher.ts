import { hash, verify } from '@node-rs/argon2';
import { PasswordHasher } from '../../domain/ports';

/** Argon2id with the OWASP-recommended baseline (19 MiB, 2 iterations, 1 lane). */
export class Argon2PasswordHasher extends PasswordHasher {
  hash(plain: string): Promise<string> {
    return hash(plain, { memoryCost: 19_456, timeCost: 2, parallelism: 1 });
  }

  async verify(passwordHash: string, plain: string): Promise<boolean> {
    try {
      return await verify(passwordHash, plain);
    } catch {
      return false;
    }
  }
}
