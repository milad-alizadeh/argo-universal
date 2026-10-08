import { z } from 'zod';
import { sessionColumns } from '../columns';
import type { ElicitationSchema } from './snapshot';

// Keep skipped questions absent, as the request form does; free text can answer an enum field.
export function createElicitationAnswerSchema(
  schema: ElicitationSchema,
): z.ZodObject<
  {
    [x: string]:
      | z.ZodOptional<z.ZodArray<z.ZodString>>
      | z.ZodOptional<z.ZodBoolean>
      | z.ZodOptional<z.ZodNumber>
      | z.ZodOptional<z.ZodString>;
  },
  z.core.$strict
> {
  const types = {
    string: z.string(),
    number: z.number(),
    integer: z.int(),
    boolean: z.boolean(),
    array: z.array(z.string()),
  };
  const fields = Object.fromEntries(
    Object.entries(schema.properties).map(
      ([name, property]): [
        string,
        (
          | z.ZodOptional<z.ZodArray<z.ZodString>>
          | z.ZodOptional<z.ZodBoolean>
          | z.ZodOptional<z.ZodNumber>
          | z.ZodOptional<z.ZodString>
        ),
      ] => [name, types[property.type].optional()],
    ),
  );
  return z.strictObject(fields);
}

export const SessionAnswerElicitationInput = z.strictObject({
  sessionId: sessionColumns.shape.id,
  requestId: z.string(),
  action: z.enum(['accept', 'decline', 'cancel']),
  content: z.record(z.string(), z.unknown()).optional(),
});
export type SessionAnswerElicitationInput = z.infer<
  typeof SessionAnswerElicitationInput
>;

export const SessionAnswerElicitationOutput = z.strictObject({});
export type SessionAnswerElicitationOutput = z.infer<
  typeof SessionAnswerElicitationOutput
>;
