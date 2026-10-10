import type { SessionNewInput, SessionNewOutput } from '@repo/contracts';
import { listBranches } from '@repo/git';
import { TRPCError } from '@trpc/server';
import { waitFor } from 'xstate';
import type { Context } from '../../engine/context';
import { findMachineActor } from '../../lib/machine-actor';
import { databaseWriterId, writerMachine } from '../feed';
import { readProjectPath } from '../projects';
import {
  submitSessionPrompt,
  validateSessionCommandAdmission,
} from './session-command';
import { applySessionConfig } from './session-configuration';
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

async function waitForSessionInsertCommitted(
  sessionActor: SessionActorRef,
): Promise<void> {
  const databaseWriter = findMachineActor(
    sessionActor.system,
    databaseWriterId,
    writerMachine,
  );
  if (!databaseWriter || databaseWriter.getSnapshot().status !== 'active')
    throw new Error('Database Writer is unavailable');
  const { sessionId, sessionInsertCommitted } =
    sessionActor.getSnapshot().context;
  const outcome = await sessionInsertCommitted;
  if (outcome !== 'committed')
    throw new TRPCError({
      code: 'INTERNAL_SERVER_ERROR',
      message:
        outcome === 'retrying'
          ? `Session ${sessionId} was not stored because the writer is retrying. Retry the Session.`
          : `Session ${sessionId} was not stored`,
    });
}

export async function createSession(
  context: Pick<
    Context,
    'database' | 'sessions' | 'createId' | 'sessionCommandSignal'
  >,
  newSession: SessionNewInput,
): Promise<SessionNewOutput> {
  const projectPath = await requireCheckoutProjectPath(
    context.database,
    newSession,
  );
  validateSessionCommandAdmission(context);
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
  await waitForSessionInsertCommitted(
    requireOpenSessionActor(context.sessions, sessionId),
  );
  await applyInitialConfiguration(
    requireOpenSessionActor(context.sessions, sessionId),
    newSession,
  );
  await submitInitialAcpPrompt(
    requireOpenSessionActor(context.sessions, sessionId),
  );
  return { sessionId };
}

const submitInitialAcpPrompt = (session: SessionActorRef): Promise<void> => {
  const { input, acpLease } = session.getSnapshot().context;
  if (!acpLease || input.kind !== 'new' || input.prompt.length === 0)
    return Promise.resolve();
  return submitSessionPrompt(session, {
    turnId: input.turnId,
    content: input.prompt,
  });
};

const applyInitialConfiguration = async (
  session: SessionActorRef,
  input: SessionNewInput,
): Promise<void> => {
  if (!session.getSnapshot().context.acpLease) return;
  for (const choice of input.configOptions)
    await applySessionConfig(session, {
      sessionId: session.getSnapshot().context.sessionId,
      configId: choice.configId,
      ...(typeof choice.value === 'boolean'
        ? { type: 'boolean', value: choice.value }
        : { type: 'id', value: choice.value }),
    });
};
