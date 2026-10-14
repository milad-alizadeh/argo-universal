import { parse, type ParseError, printParseErrorCode } from 'jsonc-parser';
import { z } from 'zod';

const entrySchema = z.strictObject({
  files: z.tuple([z.string()]),
  rules: z.record(z.string(), z.literal('off')),
});

const waiverSchema = z.strictObject({
  $schema: z.string().optional(),
  overrides: z.array(entrySchema),
});

export type Entry = z.infer<typeof entrySchema>;

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

export function readWaivers(text: string): Entry[] {
  const entries = parseJsonc(waiverSchema, text).overrides;
  const globs = entries.map((entry): string => entry.files[0]);

  if (new Set(globs).size !== globs.length)
    throw new Error('Duplicate waiver entries');

  return entries;
}
