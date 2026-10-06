import { TRPCError } from '@trpc/server';

// Contract procedures become operational in issue #74.
export function notImplemented(): never {
  throw new TRPCError({
    code: 'NOT_IMPLEMENTED',
    message: 'This procedure is not implemented yet',
  });
}
