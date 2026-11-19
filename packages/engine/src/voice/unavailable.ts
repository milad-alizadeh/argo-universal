import { TRPCError } from '@trpc/server';

// A Voice call that cannot be had now: the Server's answer is a failed precondition.
export const unavailable = (message: string): TRPCError =>
  new TRPCError({ code: 'PRECONDITION_FAILED', message });

// Why no Voice call can be had: the Server was given no Voice provider.
export const noProviderReason = 'No Voice provider is configured';

// The refusal of an act on a Session's Voice call when that Session has none.
export const noVoiceCall = (): TRPCError =>
  unavailable('The Session has no Voice call');
