import type { VoiceStartOutput } from '@repo/contracts';
import { TRPCError } from '@trpc/server';
import type { SnapshotFrom } from 'xstate';
import type { EndedCall } from './call-types';
import type { voiceCallMachine } from './call.machine';

type CallSnapshot = SnapshotFrom<typeof voiceCallMachine>;

// The start has settled once the provider answered or the call is over.
export const startSettled = (snapshot: CallSnapshot): boolean =>
  snapshot.matches('idle') || snapshot.context.call?.answer != null;

const answerOfCall = (snapshot: CallSnapshot, callId: string): string | null =>
  snapshot.context.call?.callId === callId
    ? snapshot.context.call.answer
    : null;

const endedMessage = (ended: EndedCall | null): string =>
  ended
    ? `The Voice call ended: ${ended.reason}`
    : 'The Voice call failed to start';

// Why a start that settled without an answer did not get one.
const failureOf = ({ context }: CallSnapshot): string =>
  context.failure ?? endedMessage(context.ended);

export function answerOf(
  snapshot: CallSnapshot,
  callId: string,
): VoiceStartOutput {
  const answer = answerOfCall(snapshot, callId);

  if (answer !== null) return { callId, answer };

  throw new TRPCError({
    code: 'INTERNAL_SERVER_ERROR',
    message: failureOf(snapshot),
  });
}
