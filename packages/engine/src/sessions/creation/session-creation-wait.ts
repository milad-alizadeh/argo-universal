import { SessionOpenFailure } from '@repo/contracts';
import { TRPCError } from '@trpc/server';
import { waitFor } from 'xstate';
import type { SessionActorRef } from '../session-machine';

type Snapshot = ReturnType<SessionActorRef['getSnapshot']>;

const sessionStoreFailure = ({ context }: Snapshot): TRPCError =>
  new TRPCError({
    code: 'PRECONDITION_FAILED',
    cause: context.openError
      ? new SessionOpenFailure(context.openError)
      : undefined,
    message: context.failure ?? `Session ${context.sessionId} closed`,
  });

const insertFailure = (
  sessionId: string,
  outcome: 'retrying' | 'failed' | null,
): TRPCError =>
  new TRPCError({
    code: 'INTERNAL_SERVER_ERROR',
    message:
      outcome === 'retrying'
        ? `Session ${sessionId} was not stored because the writer is retrying. Retry the Session.`
        : `Session ${sessionId} was not stored`,
  });

export async function waitForSessionStored(
  sessionActor: SessionActorRef,
): Promise<void> {
  const sessionSnapshot = await waitFor(
    sessionActor,
    (sessionSnapshot): boolean =>
      sessionSnapshot.status !== 'active' || sessionSnapshot.context.stored,
    { timeout: Infinity },
  );

  if (!sessionSnapshot.context.stored)
    throw sessionStoreFailure(sessionSnapshot);
}

export async function waitForSessionInsertCommitted(
  sessionActor: SessionActorRef,
): Promise<void> {
  const { sessionId, sessionInsertCommitted, input } =
    sessionActor.getSnapshot().context;

  if (input.writer.getSnapshot().status !== 'active')
    throw new Error('Database Writer is unavailable');

  const outcome = await sessionInsertCommitted;

  if (outcome !== 'committed') throw insertFailure(sessionId, outcome);
}
