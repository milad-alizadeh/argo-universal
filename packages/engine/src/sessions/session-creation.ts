import type { SessionNewInput, SessionNewOutput } from '@repo/contracts';
import { SessionOpenFailure } from '@repo/contracts';
import type { CoreHooks } from '@repo/contracts/plugins';
import { listBranches } from '@repo/git';
import { TRPCError } from '@trpc/server';
import { waitFor } from 'xstate';
import { requireInstalledAgent } from '../agents';
import { readProjectPath } from '../projects';
import { isOfferedConfigChoice } from './admission/config-admission';
import type { SessionRouterDeps } from './router-deps';
import {
  submitSessionPrompt,
  validateSessionCommandAdmission,
} from './session-command';
import { applySessionConfig } from './session-configuration';
import type { SessionActorRef } from './session-machine';
import {
  requireOpenSessionActor,
  sendCheckedOpenSessionsCommand,
} from './session-opening';

async function requireCheckoutProjectPath(
  database: SessionRouterDeps['database'],
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
      cause: sessionSnapshot.context.openError
        ? new SessionOpenFailure(sessionSnapshot.context.openError)
        : undefined,
      message:
        sessionSnapshot.context.failure ??
        `Session ${sessionSnapshot.context.sessionId} closed`,
    });
}

async function waitForSessionInsertCommitted(
  sessionActor: SessionActorRef,
): Promise<void> {
  const { sessionId, sessionInsertCommitted, input } =
    sessionActor.getSnapshot().context;

  if (input.writer.getSnapshot().status !== 'active')
    throw new Error('Database Writer is unavailable');

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
  deps: Pick<
    SessionRouterDeps,
    | 'database'
    | 'sessions'
    | 'createId'
    | 'sessionCommandSignal'
    | 'installedAgents'
    | 'hooks'
  >,
  newSession: SessionNewInput,
): Promise<SessionNewOutput> {
  // The open Sessions machine checks again as the last word (ADR-0003); this check gives the typed failure.
  requireInstalledAgent(deps.installedAgents, newSession.agent);

  const projectPath = await requireCheckoutProjectPath(
    deps.database,
    newSession,
  );

  validateSessionCommandAdmission(deps);
  const sessionId = deps.createId();
  sendCheckedOpenSessionsCommand(deps.sessions, {
    type: 'sessions.create',
    sessionId,
    turnId: deps.createId(),
    ...newSession,
    projectPath,
  });
  await waitForSessionStored(requireOpenSessionActor(deps.sessions, sessionId));
  await waitForSessionInsertCommitted(
    requireOpenSessionActor(deps.sessions, sessionId),
  );
  await startSession(
    deps,
    requireOpenSessionActor(deps.sessions, sessionId),
    newSession,
  );

  return { sessionId };
}

// Once stored, the Session applies its first choices, then submits its first prompt.
async function startSession(
  deps: Pick<SessionRouterDeps, 'hooks'>,
  session: SessionActorRef,
  newSession: SessionNewInput,
): Promise<void> {
  await applyInitialConfiguration(session, newSession);
  await submitInitialAcpPrompt(session, deps.hooks);
}

// The first prompt passes `prompt.submit` Hooks like any other; a dropped one leaves the Session waiting.
const submitInitialAcpPrompt = async (
  session: SessionActorRef,
  hooks: CoreHooks,
): Promise<void> => {
  const { input, acpLease, sessionId } = session.getSnapshot().context;

  if (!acpLease || input.kind !== 'new' || input.prompt.length === 0) return;

  const answer = await hooks['prompt.submit']({
    sessionId,
    projectId: input.projectId,
    prompt: input.prompt,
  });

  if ('drop' in answer) return;

  await submitSessionPrompt(session, {
    turnId: input.turnId,
    content: answer.prompt,
  });
};

const applyInitialConfiguration = async (
  session: SessionActorRef,
  input: SessionNewInput,
): Promise<void> => {
  if (!session.getSnapshot().context.acpLease) return;

  for (const choice of input.configOptions) {
    if (
      choice.optional &&
      !isOfferedConfigChoice(
        session.getSnapshot().context.configOptions,
        choice,
      )
    )
      continue;
    await applySessionConfig(session, {
      sessionId: session.getSnapshot().context.sessionId,
      configId: choice.configId,
      ...(typeof choice.value === 'boolean'
        ? { type: 'boolean', value: choice.value }
        : { type: 'id', value: choice.value }),
    });
  }
};
