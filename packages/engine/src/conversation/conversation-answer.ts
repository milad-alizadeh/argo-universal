import type { ConversationStartOutput } from '@repo/contracts';
import { TRPCError } from '@trpc/server';
import type { SnapshotFrom } from 'xstate';
import type { EndedCall, StartRefusal } from './conversation-types';
import type { conversationMachine } from './conversation.machine';
import { refusalError } from './conversation-room';

export type CallSnapshot = SnapshotFrom<typeof conversationMachine>;

const refusalOf = (
  { context: { refused } }: CallSnapshot,
  conversationId: string,
): StartRefusal | null => (refused?.conversationId === conversationId ? refused.refusal : null);

// The machine began a call for this start, or the error says why it refused.
export function requireBegun(snapshot: CallSnapshot, conversationId: string): void {
  const refusal = refusalOf(snapshot, conversationId);

  if (refusal) throw refusalError(refusal);
}

// An end ended a call when the machine was running one before it and is idle after.
export const endedBetween = (
  before: CallSnapshot,
  after: CallSnapshot,
): boolean => before.matches('running') && after.matches('idle');

// The start has settled once the provider answered or the call is over.
export const startSettled = (snapshot: CallSnapshot): boolean =>
  snapshot.matches('idle') || snapshot.context.call?.answer != null;

const answerOfCall = (snapshot: CallSnapshot, conversationId: string): string | null =>
  snapshot.context.call?.conversationId === conversationId
    ? snapshot.context.call.answer
    : null;

const endedMessage = (ended: EndedCall | null): string =>
  ended
    ? `The Conversation ended: ${ended.reason}`
    : 'The Conversation failed to start';

// Why a start that settled without an answer did not get one.
const failureOf = ({ context }: CallSnapshot): string =>
  context.failure ?? endedMessage(context.ended);

export function answerOf(
  snapshot: CallSnapshot,
  conversationId: string,
): ConversationStartOutput {
  const answer = answerOfCall(snapshot, conversationId);

  if (answer !== null) return { conversationId, answer };

  throw new TRPCError({
    code: 'INTERNAL_SERVER_ERROR',
    message: failureOf(snapshot),
  });
}
