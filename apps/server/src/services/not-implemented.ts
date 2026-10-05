import { TRPCError } from '@trpc/server';

// Contract procedures become operational in issues #40 and #41.
export function notImplemented(): never {
  throw new TRPCError({
    code: 'NOT_IMPLEMENTED',
    message: 'This procedure is not implemented yet',
  });
}
