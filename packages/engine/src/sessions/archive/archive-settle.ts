import { TRPCError } from '@trpc/server';
import { waitFor } from 'xstate';
import type { SessionActorRef } from '../session-machine';

export type Snapshot = ReturnType<SessionActorRef['getSnapshot']>;

// The limit stays in the log; the person sees that the change may still land.
const timedOut = (limitMs: number, cause: unknown): TRPCError =>
  new TRPCError({
    code: 'TIMEOUT',
    message: 'This is taking longer than expected and may still finish',
    cause: new Error(`The Session did not settle within ${limitMs} ms`, {
      cause,
    }),
  });

// Waits for an archive or its Undo to settle, up to the limit.
export async function settleWithin(
  actor: SessionActorRef,
  isSettled: (snapshot: Snapshot) => boolean,
  limitMs: number,
): Promise<Snapshot> {
  const deadline = AbortSignal.timeout(limitMs);

  try {
    return await waitFor(actor, isSettled, { signal: deadline });
  } catch (error) {
    throw deadline.aborted ? timedOut(limitMs, error) : error;
  }
}
