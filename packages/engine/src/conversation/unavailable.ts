import { TRPCError } from '@trpc/server';

// A Conversation that cannot be had now: the Server's answer is a failed precondition.
export const unavailable = (message: string): TRPCError =>
  new TRPCError({ code: 'PRECONDITION_FAILED', message });

// Why no Conversation can be had: the Server was given no Conversation provider.
export const noProviderReason = 'No Conversation provider is configured';

// The refusal of an act on a Session's Conversation when that Session has none.
export const noConversation = (): TRPCError =>
  unavailable('The Session has no Conversation');
