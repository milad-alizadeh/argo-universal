import type { Json } from '@repo/contracts/plugins/hook-protocol';
import { TRPCError } from '@trpc/server';
import { z } from 'zod';

export function operationParams<Schema extends z.ZodType>(
  schema: Schema,
  params: Json | undefined,
): z.output<Schema> {
  try {
    return schema.parse(params);
  } catch (cause) {
    if (!(cause instanceof z.ZodError)) throw cause;
    throw new TRPCError({ code: 'BAD_REQUEST', message: cause.message, cause });
  }
}
