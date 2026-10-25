import type {
  SessionArchiveOutput,
  SessionUnarchiveOutput,
} from '@repo/contracts';
import { TRPCError } from '@trpc/server';
import { waitFor } from 'xstate';
import { findMachineActor } from '../../lib/machine-actor';
import type { SessionRouterDeps } from '../router-deps';
import {
  sendSessionCommand,
  validateSessionCommandAdmission,
} from '../session-command';
import { type SessionActorRef, sessionMachine } from '../session-machine';
import {
  requireOpenSessionActor,
  sendCheckedOpenSessionsCommand,
} from '../session-opening';
import { sessionActorId } from '../session-system';

type ArchiveDeps = Pick<
  SessionRouterDeps,
  'sessions' | 'readSession' | 'sessionCommandSignal'
>;

type Snapshot = ReturnType<SessionActorRef['getSnapshot']>;

/*
 * How long an archive or an Undo may take before the caller is told. The Session machine bounds its own
 * stages: closing the Agent takes up to 5 s and the Feed flush up to 5 s, so an archive that works ends
 * within about 10 s plus its Writer commit. 30 s is three times that, and the same as the other Engine
 * network and process limits. When the limit passes, the Session actor carries on and may still finish;
 * only this acknowledgement stops waiting.
 */
export const archiveSettleLimitMs = 30_000;

const findSession = (
  deps: ArchiveDeps,
  id: string,
): SessionActorRef | undefined =>
  findMachineActor(deps.sessions.system, sessionActorId(id), sessionMachine);

// Only an active, top-level Session archives: a child is archived with its parent.
function requireArchivable(deps: ArchiveDeps, sessionId: string): void {
  const record = deps.readSession(sessionId);

  if (record.parentSessionId !== null || record.archivedAt !== null)
    throw new TRPCError({
      code: 'CONFLICT',
      message: 'Only an active top-level Session can be archived',
    });
}

function startArchive(deps: ArchiveDeps, sessionId: string): SessionActorRef {
  requireArchivable(deps, sessionId);

  const live = findSession(deps, sessionId);

  if (live) {
    sendSessionCommand(live, { type: 'session.archive' });

    return live;
  }

  sendCheckedOpenSessionsCommand(deps.sessions, {
    type: 'sessions.archive',
    sessionId,
    agent: deps.readSession(sessionId).agent,
  });

  return requireOpenSessionActor(deps.sessions, sessionId);
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
  if (!outcome.matches('archived'))
    throw new TRPCError({
      code: 'INTERNAL_SERVER_ERROR',
      message: outcome.context.failure ?? 'Archive failed',
    });
}

export async function archiveSession(
  deps: ArchiveDeps,
  sessionId: string,
  limitMs: number = archiveSettleLimitMs,
): Promise<SessionArchiveOutput> {
  validateSessionCommandAdmission(deps);

  const outcome = await settleWithin(
    startArchive(deps, sessionId),
    (snapshot) => snapshot.matches('archived') || snapshot.status !== 'active',
    limitMs,
  );

  requireArchived(outcome);

  return {};
}

function startUndo(deps: ArchiveDeps, sessionId: string): SessionActorRef {
  deps.readSession(sessionId);
  const actor = findSession(deps, sessionId);

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
  deps: ArchiveDeps,
  sessionId: string,
  limitMs: number = archiveSettleLimitMs,
): Promise<SessionUnarchiveOutput> {
  validateSessionCommandAdmission(deps);

  const outcome = await settleWithin(
    startUndo(deps, sessionId),
    (snapshot) => snapshot.status !== 'active',
    limitMs,
  );

  requireUndoSucceeded(outcome);

  return {};
}
