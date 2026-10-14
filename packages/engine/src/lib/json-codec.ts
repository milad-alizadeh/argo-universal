import { z } from 'zod';

// Parses JSON text, reporting malformed text as an `invalid_format` issue instead of throwing.
const decodeJson = <Value>(
  text: string,
  context: z.core.ParsePayload<string>,
): Value => {
  try {
    return JSON.parse(text);
  } catch {
    context.issues.push({
      code: 'invalid_format',
      format: 'json',
      input: text,
    });

    return z.NEVER;
  }
};

// JSON text checked against `schema`: malformed JSON and a wrong shape both fail as issues, so `safeParse` never throws and `parse` throws one ZodError.
export const jsonCodec = <Schema extends z.ZodType>(
  schema: Schema,
): z.ZodCodec<z.ZodString, Schema> =>
  z.codec(z.string(), schema, {
    decode: (text, context): z.input<Schema> => decodeJson(text, context),
    encode: (value): string => JSON.stringify(value),
  });
