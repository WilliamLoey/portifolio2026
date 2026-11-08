import { BadRequestException, PipeTransform } from '@nestjs/common';
import { z } from 'zod';

/** Validates with the shared @portfolio/contracts schemas; errors use the documented ApiError shape. */
export class ZodValidationPipe<T extends z.ZodType> implements PipeTransform<unknown, z.output<T>> {
  constructor(private readonly schema: T) {}

  transform(value: unknown): z.output<T> {
    const result = this.schema.safeParse(value);
    if (!result.success) {
      throw new BadRequestException({
        statusCode: 400,
        error: 'VALIDATION',
        message: 'Some fields are invalid',
        errors: result.error.issues.map((issue) => ({ path: issue.path.join('.'), message: issue.message })),
      });
    }
    return result.data;
  }
}

export const validate = <T extends z.ZodType>(schema: T) => new ZodValidationPipe(schema);
