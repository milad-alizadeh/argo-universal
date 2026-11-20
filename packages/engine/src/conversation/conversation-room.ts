import { TRPCError } from '@trpc/server';
import type { StartRefusal } from './conversation-types';
import { noProviderReason, unavailable } from './unavailable';

// A Conversation already runs: another cannot start, and no preview plays over it.
export const callRunning = (): TRPCError =>
  new TRPCError({
    code: 'CONFLICT',
    message: 'A Conversation is already running',
  });

const refusals: Record<StartRefusal, () => TRPCError> = {
  'call-running': callRunning,
  'no-provider': () => unavailable(noProviderReason),
  'session-not-open': () =>
    new TRPCError({ code: 'NOT_FOUND', message: 'The Session is not open' }),
};

// What the one who asked is told when the Conversation machine refused their start.
export const refusalError = (refusal: StartRefusal): TRPCError =>
  refusals[refusal]();
