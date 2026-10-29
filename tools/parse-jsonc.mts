import { parse, type ParseError, printParseErrorCode } from 'jsonc-parser';
import { z } from 'zod';

export function parseJsonc<Schema extends z.ZodType>(
  schema: Schema,
  text: string,
): z.output<Schema> {
  const errors: ParseError[] = [];
  const value: unknown = parse(text, errors, { allowTrailingComma: true });

  if (errors.length > 0) throw new Error(errors.map(describeError).join(', '));

  return schema.parse(value);
}

const describeError = (error: ParseError): string =>
  `${printParseErrorCode(error.error)} at ${error.offset}`;
