import { TRPCError } from '@trpc/server';

// A param a Session caller's scope fills from the caller; any other caller names it, or is told how.
export function namedParam<Value>(
  value: Value | undefined,
  refusal: string,
): Value {
  if (value === undefined)
    throw new TRPCError({ code: 'BAD_REQUEST', message: refusal });

  return value;
}
