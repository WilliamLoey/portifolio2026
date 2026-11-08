export type DomainErrorCode =
  | 'NOT_FOUND'
  | 'CONFLICT'
  | 'UNAUTHORIZED'
  | 'VALIDATION'
  | 'RATE_LIMITED'
  | 'IN_USE';

/**
 * Errors raised by the domain/application layers. They know nothing about HTTP;
 * the presentation layer maps each code to a status (see DomainExceptionFilter).
 */
export abstract class DomainError extends Error {
  abstract readonly code: DomainErrorCode;

  constructor(message: string) {
    super(message);
    this.name = new.target.name;
  }
}

export class NotFoundError extends DomainError {
  readonly code = 'NOT_FOUND' as const;
}

export class ConflictError extends DomainError {
  readonly code = 'CONFLICT' as const;
}

export class UnauthorizedError extends DomainError {
  readonly code = 'UNAUTHORIZED' as const;
}

export class ValidationError extends DomainError {
  readonly code = 'VALIDATION' as const;
}

/** A resource cannot be removed because other content still points at it. */
export class InUseError extends DomainError {
  readonly code = 'IN_USE' as const;
}

export class RateLimitedError extends DomainError {
  readonly code = 'RATE_LIMITED' as const;

  constructor(
    message: string,
    readonly retryAfterSeconds: number,
  ) {
    super(message);
  }
}
