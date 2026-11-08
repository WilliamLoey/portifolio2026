import { Clock } from '../../domain/ports';

export class SystemClock extends Clock {
  now(): Date {
    return new Date();
  }
}
