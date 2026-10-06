import type { ElicitationSchema } from '@repo/contracts';
import { TRPCError } from '@trpc/server';
import { z } from 'zod';

// Keep skipped questions absent, as the request form does; free text can answer an enum field.
export function validateElicitationAnswer(
  schema: ElicitationSchema,
  content: Record<string, unknown> | undefined,
) {
  const types = {
    string: z.string(),
    number: z.number(),
    integer: z.int(),
    boolean: z.boolean(),
    array: z.array(z.string()),
  };
  const fields = Object.fromEntries(
    Object.entries(schema.properties).map(([name, property]) => [
      name,
      types[property.type].optional(),
    ]),
  );
  const result = z.strictObject(fields).safeParse(content ?? {});
  if (!result.success)
    throw new TRPCError({
      code: 'BAD_REQUEST',
      message: 'The answer does not match the Elicitation form',
      cause: result.error,
    });
}
