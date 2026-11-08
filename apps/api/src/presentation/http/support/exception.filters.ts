import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus, Logger } from '@nestjs/common';
import type { Response } from 'express';
import { DomainError, DomainErrorCode, RateLimitedError } from '../../../domain/errors';

const STATUS_BY_CODE: Record<DomainErrorCode, HttpStatus> = {
  NOT_FOUND: HttpStatus.NOT_FOUND,
  CONFLICT: HttpStatus.CONFLICT,
  IN_USE: HttpStatus.CONFLICT,
  UNAUTHORIZED: HttpStatus.UNAUTHORIZED,
  VALIDATION: HttpStatus.UNPROCESSABLE_ENTITY,
  RATE_LIMITED: HttpStatus.TOO_MANY_REQUESTS,
};

/**
 * One error shape for every response: { statusCode, error, message, errors? }.
 * Unexpected errors are logged with their stack and answered with a generic 500,
 * so internals (SQL, file paths, provider messages) never reach the client.
 */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger('Exceptions');

  catch(exception: unknown, host: ArgumentsHost): void {
    const response = host.switchToHttp().getResponse<Response>();

    if (exception instanceof DomainError) {
      const status = STATUS_BY_CODE[exception.code];
      if (exception instanceof RateLimitedError) response.setHeader('Retry-After', String(exception.retryAfterSeconds));
      response.status(status).json({ statusCode: status, error: exception.code, message: exception.message });
      return;
    }

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const body = exception.getResponse();
      if (typeof body === 'object' && body !== null && 'error' in body && 'errors' in body) {
        response.status(status).json(body);
        return;
      }
      const message =
        typeof body === 'string'
          ? body
          : Array.isArray((body as { message?: unknown }).message)
            ? ((body as { message: string[] }).message).join(', ')
            : String((body as { message?: unknown }).message ?? exception.message);
      response.status(status).json({ statusCode: status, error: HttpStatus[status] ?? 'ERROR', message });
      return;
    }

    this.logger.error(exception instanceof Error ? exception.message : String(exception), (exception as Error)?.stack);
    response.status(500).json({ statusCode: 500, error: 'INTERNAL_SERVER_ERROR', message: 'Something went wrong on our side' });
  }
}
