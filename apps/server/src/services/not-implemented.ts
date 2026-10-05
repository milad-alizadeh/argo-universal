import { TRPCError } from '@trpc/server';

// Contract procedures become operational in issues #35 and #40.
export function notImplemented(): never {
  throw new TRPCError({
    code: 'NOT_IMPLEMENTED',
    message: 'This procedure is not implemented yet',
  });
}
