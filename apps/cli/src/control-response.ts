import { createRejectionCounter } from '@repo/machine-log';
import type { z } from 'zod';

const rejections = createRejectionCounter('cli');

export function readControlResponse<Schema extends z.ZodType>(
  schema: Schema,
  value: z.input<Schema>,
): z.output<Schema> {
  const parsed = schema.safeParse(value);

  if (parsed.success) return parsed.data;
  rejections.report('unrecognised Operation response', parsed.error.issues);
  throw new Error('The Server returned an invalid Operation response');
}
