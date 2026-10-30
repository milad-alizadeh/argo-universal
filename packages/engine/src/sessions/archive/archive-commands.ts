import type {
  SessionArchiveOutput,
  SessionUnarchiveOutput,
} from '@repo/contracts';
import { TRPCError } from '@trpc/server';
import { sendSessionCommand } from '../session-command';
import type { SessionActorRef } from '../session-machine';
import type { HandlerSources } from '../session-sources';
import { settleWithin, type Snapshot } from './archive-settle';

type ArchiveSources = HandlerSources<
  'readSession',
  'admit' | 'session' | 'open'
>;

/*
 * How long an archive or an Undo may take before the caller is told. The Session machine bounds its own
 * stages: closing the Agent takes up to 5 s and the Feed flush up to 5 s, so an archive that works ends
 * within about 10 s plus its Writer commit. 30 s is three times that, and the same as the other Engine
 * network and process limits. When the limit passes, the Session actor carries on and may still finish;
 * only this acknowledgement stops waiting.
 */
const archiveSettleLimitMs = 30_000;

// Only an active, top-level Session archives: a child is archived with its parent.
function requireArchivable(sources: ArchiveSources, sessionId: string): void {
  const record = sources.readSession(sessionId);

  if (record.parentSessionId !== null || record.archivedAt !== null)
    throw new TRPCError({
      code: 'CONFLICT',
      message: 'Only an active top-level Session can be archived',
    });
}

function startArchive(
  sources: ArchiveSources,
  sessionId: string,
): SessionActorRef {
  requireArchivable(sources, sessionId);

  const live = sources.open.session(sessionId);

  if (!live) return openArchiving(sources, sessionId);

  sendSessionCommand(live, { type: 'session.archive' });

  return live;
}

const openArchiving = (
  sources: ArchiveSources,
  sessionId: string,
): SessionActorRef =>
  sources.open.open({
    type: 'sessions.archive',
    sessionId,
    agent: sources.readSession(sessionId).agent,
  });

function requireArchived(outcome: Snapshot): void {
  if (!outcome.hasTag('archived'))
    throw new TRPCError({
      code: 'INTERNAL_SERVER_ERROR',
      message: outcome.context.failure ?? 'Archive failed',
    });
}

export async function archiveSession(
  sources: ArchiveSources,
  sessionId: string,
  limitMs: number = archiveSettleLimitMs,
): Promise<SessionArchiveOutput> {
  sources.open.admit();

  const outcome = await settleWithin(
    startArchive(sources, sessionId),
    (snapshot) => snapshot.hasTag('archived') || snapshot.status !== 'active',
    limitMs,
  );

  requireArchived(outcome);

  return {};
}

function startUndo(
  sources: ArchiveSources,
  sessionId: string,
): SessionActorRef {
  sources.readSession(sessionId);
  const actor = sources.open.session(sessionId);

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
  sources: ArchiveSources,
  sessionId: string,
  limitMs: number = archiveSettleLimitMs,
): Promise<SessionUnarchiveOutput> {
  sources.open.admit();

  const outcome = await settleWithin(
    startUndo(sources, sessionId),
    (snapshot) => snapshot.status !== 'active',
    limitMs,
  );

  requireUndoSucceeded(outcome);

  return {};
}
