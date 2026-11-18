import { TRPCError } from '@trpc/server';

// A Voice call that cannot be had now: the Server's answer is a failed precondition.
export const unavailable = (message: string): TRPCError =>
  new TRPCError({ code: 'PRECONDITION_FAILED', message });
