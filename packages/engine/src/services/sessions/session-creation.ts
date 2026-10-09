import type { SessionNewInput, SessionNewOutput } from '@repo/contracts';
import { listBranches } from '@repo/git';
import { TRPCError } from '@trpc/server';
import { type SnapshotFrom, waitFor } from 'xstate';
import type { Context } from '../../engine/context';
import { findDatabaseWriter, type writerMachine } from '../feed';
import { readProjectPath } from '../projects';
import type { RegistryActorRef } from './registry-machine';
import type { SessionActorRef } from './session-machine';
import { requireSessionActor, sendRegistryCommand } from './session-opening';

async function checkoutProject(
  database: Context['database'],
  input: SessionNewInput,
): Promise<string> {
  const projectPath = readProjectPath(database, input.projectId);
  if (
    input.checkout.type === 'worktree' &&
    !(await listBranches(projectPath)).branches.includes(
      input.checkout.baseBranch,
    )
  )
    throw new TRPCError({
      code: 'BAD_REQUEST',
      message: `No local branch ${input.checkout.baseBranch}`,
    });
  return projectPath;
}

async function stored(actor: SessionActorRef): Promise<void> {
  const snapshot = await waitFor(
    actor,
    (snapshot): boolean =>
      snapshot.status !== 'active' || snapshot.context.stored,
    { timeout: Infinity },
  );
  if (!snapshot.context.stored)
    throw new TRPCError({
      code: 'PRECONDITION_FAILED',
      message:
        snapshot.context.failure ??
        `Session ${snapshot.context.sessionId} closed`,
    });
}

function insertQueued(
  snapshot: SnapshotFrom<typeof writerMachine>,
  sessionId: string,
): boolean {
  return snapshot.context.queue.some(
    (job): boolean =>
      job.type === 'sessionInsert' && job.session.id === sessionId,
  );
}

async function written(
  sessions: RegistryActorRef,
  sessionId: string,
): Promise<void> {
  const writer = findDatabaseWriter(sessions.system);
  if (!writer) return;
  const snapshot = await waitFor(
    writer,
    (snapshot): boolean =>
      snapshot.status !== 'active' ||
      !insertQueued(snapshot, sessionId) ||
      snapshot.matches('waitingToRetry'),
    { timeout: Infinity },
  );
  if (insertQueued(snapshot, sessionId))
    throw new TRPCError({
      code: 'INTERNAL_SERVER_ERROR',
      message: snapshot.matches('waitingToRetry')
        ? `Session ${sessionId} was not stored because the writer is retrying. Retry the Session.`
        : `Session ${sessionId} was not stored`,
    });
}

export async function createSession(
  context: Pick<Context, 'database' | 'sessions' | 'createId'>,
  input: SessionNewInput,
): Promise<SessionNewOutput> {
  const projectPath = await checkoutProject(context.database, input);
  const sessionId = context.createId();
  sendRegistryCommand(context.sessions, {
    type: 'sessions.create',
    sessionId,
    turnId: context.createId(),
    ...input,
    projectPath,
  });
  await stored(requireSessionActor(context.sessions, sessionId));
  await written(context.sessions, sessionId);
  return { sessionId };
}
