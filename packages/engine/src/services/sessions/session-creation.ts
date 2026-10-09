import type { SessionNewInput, SessionNewOutput } from '@repo/contracts';
import { listBranches } from '@repo/git';
import { TRPCError } from '@trpc/server';
import { type SnapshotFrom, waitFor } from 'xstate';
import type { Context } from '../../engine/context';
import { findDatabaseWriter, type writerMachine } from '../feed';
import { readProjectPath } from '../projects';
import type { RegistryActorRef } from './registry-machine';
import type { SessionActorRef } from './session-machine';
import {
  requireOpenSessionActor,
  sendCheckedRegistryCommand,
} from './session-opening';

async function requireCheckoutProjectPath(
  database: Context['database'],
  newSession: Pick<SessionNewInput, 'projectId' | 'checkout'>,
): Promise<string> {
  const projectPath = readProjectPath(database, newSession.projectId);
  if (
    newSession.checkout.type === 'worktree' &&
    !(await listBranches(projectPath)).branches.includes(
      newSession.checkout.baseBranch,
    )
  )
    throw new TRPCError({
      code: 'BAD_REQUEST',
      message: `No local branch ${newSession.checkout.baseBranch}`,
    });
  return projectPath;
}

async function waitForSessionStored(
  sessionActor: SessionActorRef,
): Promise<void> {
  const sessionSnapshot = await waitFor(
    sessionActor,
    (sessionSnapshot): boolean =>
      sessionSnapshot.status !== 'active' || sessionSnapshot.context.stored,
    { timeout: Infinity },
  );
  if (!sessionSnapshot.context.stored)
    throw new TRPCError({
      code: 'PRECONDITION_FAILED',
      message:
        sessionSnapshot.context.failure ??
        `Session ${sessionSnapshot.context.sessionId} closed`,
    });
}

function isSessionInsertQueued(
  writerSnapshot: SnapshotFrom<typeof writerMachine>,
  sessionId: string,
): boolean {
  return writerSnapshot.context.queue.some(
    (job): boolean =>
      job.type === 'sessionInsert' && job.session.id === sessionId,
  );
}

async function waitForSessionInsertCommitted(
  sessionRegistry: RegistryActorRef,
  sessionId: string,
): Promise<void> {
  const databaseWriter = findDatabaseWriter(sessionRegistry.system);
  if (!databaseWriter) return;
  const writerSnapshot = await waitFor(
    databaseWriter,
    (writerSnapshot): boolean =>
      writerSnapshot.status !== 'active' ||
      !isSessionInsertQueued(writerSnapshot, sessionId) ||
      writerSnapshot.matches('waitingToRetry'),
    { timeout: Infinity },
  );
  if (isSessionInsertQueued(writerSnapshot, sessionId))
    throw new TRPCError({
      code: 'INTERNAL_SERVER_ERROR',
      message: writerSnapshot.matches('waitingToRetry')
        ? `Session ${sessionId} was not stored because the writer is retrying. Retry the Session.`
        : `Session ${sessionId} was not stored`,
    });
}

export async function createSession(
  context: Pick<Context, 'database' | 'sessions' | 'createId'>,
  newSession: SessionNewInput,
): Promise<SessionNewOutput> {
  const projectPath = await requireCheckoutProjectPath(
    context.database,
    newSession,
  );
  const sessionId = context.createId();
  sendCheckedRegistryCommand(context.sessions, {
    type: 'sessions.create',
    sessionId,
    turnId: context.createId(),
    ...newSession,
    projectPath,
  });
  await waitForSessionStored(
    requireOpenSessionActor(context.sessions, sessionId),
  );
  await waitForSessionInsertCommitted(context.sessions, sessionId);
  return { sessionId };
}
