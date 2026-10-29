import type {
  SessionArchiveOutput,
  SessionUnarchiveOutput,
} from '@repo/contracts';
import { TRPCError } from '@trpc/server';
import { waitFor } from 'xstate';
import type { OpenSessions } from '../open-sessions';
import { sendSessionCommand } from '../session-command';
import type { SessionActorRef } from '../session-machine';

type Snapshot = ReturnType<SessionActorRef['getSnapshot']>;

/*
 * How long an archive or an Undo may take before the caller is told. The Session machine bounds its own
 * stages: closing the Agent takes up to 5 s and the Feed flush up to 5 s, so an archive that works ends
 * within about 10 s plus its Writer commit. 30 s is three times that, and the same as the other Engine
 * network and process limits. When the limit passes, the Session actor carries on and may still finish;
 * only this acknowledgement stops waiting.
 */
const archiveSettleLimitMs = 30_000;

// Only an active, top-level Session archives: a child is archived with its parent.
function requireArchivable(open: OpenSessions, sessionId: string): void {
  const record = open.readSession(sessionId);

  if (record.parentSessionId !== null || record.archivedAt !== null)
    throw new TRPCError({
      code: 'CONFLICT',
      message: 'Only an active top-level Session can be archived',
    });
}

function startArchive(open: OpenSessions, sessionId: string): SessionActorRef {
  requireArchivable(open, sessionId);

  const live = open.session(sessionId);

  if (live) {
    sendSessionCommand(live, { type: 'session.archive' });

    return live;
  }

  return open.open({
    type: 'sessions.archive',
    sessionId,
    agent: open.readSession(sessionId).agent,
  });
}

// The limit stays in the log; the person sees that the change may still land.
const timedOut = (limitMs: number, cause: unknown): TRPCError =>
  new TRPCError({
    code: 'TIMEOUT',
    message: 'This is taking longer than expected and may still finish',
    cause: new Error(`The Session did not settle within ${limitMs} ms`, {
      cause,
    }),
  });

async function settleWithin(
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

function requireArchived(outcome: Snapshot): void {
  if (!outcome.hasTag('archived'))
    throw new TRPCError({
      code: 'INTERNAL_SERVER_ERROR',
      message: outcome.context.failure ?? 'Archive failed',
    });
}

export async function archiveSession(
  open: OpenSessions,
  sessionId: string,
  limitMs: number = archiveSettleLimitMs,
): Promise<SessionArchiveOutput> {
  open.admit();

  const outcome = await settleWithin(
    startArchive(open, sessionId),
    (snapshot) => snapshot.hasTag('archived') || snapshot.status !== 'active',
    limitMs,
  );

  requireArchived(outcome);

  return {};
}

function startUndo(open: OpenSessions, sessionId: string): SessionActorRef {
  open.readSession(sessionId);
  const actor = open.session(sessionId);

  if (!actor)
    throw new TRPCError({
      code: 'CONFLICT',
      message: 'The Undo window has ended',
    });

  sendSessionCommand(actor, { type: 'session.unarchive' });

  return actor;
}

function requireUndoSucceeded(outcome: Snapshot): void {
  if (outcome.context.failure)
    throw new TRPCError({
      code: 'INTERNAL_SERVER_ERROR',
      message: outcome.context.failure,
    });
}

export async function unarchiveSession(
  open: OpenSessions,
  sessionId: string,
  limitMs: number = archiveSettleLimitMs,
): Promise<SessionUnarchiveOutput> {
  open.admit();

  const outcome = await settleWithin(
    startUndo(open, sessionId),
    (snapshot) => snapshot.status !== 'active',
    limitMs,
  );

  requireUndoSucceeded(outcome);

  return {};
}
