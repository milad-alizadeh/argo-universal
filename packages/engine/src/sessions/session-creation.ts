import type { SessionNewInput, SessionNewOutput } from '@repo/contracts';
import { SessionOpenFailure } from '@repo/contracts';
import type { CoreHooks } from '@repo/contracts/plugins';
import { listBranches } from '@repo/git';
import { TRPCError } from '@trpc/server';
import { waitFor } from 'xstate';
import { requireInstalledAgent } from '../agents';
import { readProjectPath } from '../projects';
import { isOfferedConfigChoice } from './admission/config-admission';
import {
  observeSessionCreation,
  type AcceptedSessionStart,
} from './creation-receipt';
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

type SessionCreationDeps = Pick<
  SessionRouterDeps,
  | 'database'
  | 'sessions'
  | 'createId'
  | 'sessionCommandSignal'
  | 'installedAgents'
  | 'hooks'
>;

export type SessionCreationOrigin = {
  sessionId: string;
  startedBySessionId?: string;
};

export type { AcceptedSessionStart } from './creation-receipt';

export type SessionCreation = {
  sessionId: string;
  turnId: string;
  accepted: Promise<AcceptedSessionStart>;
};

export async function createSession(
  deps: SessionCreationDeps,
  newSession: SessionNewInput,
  origin?: SessionCreationOrigin,
): Promise<SessionNewOutput> {
  const { sessionId } = await createSessionAccepted(deps, newSession, origin);

  return { sessionId };
}

// Only an actually committed first prompt returns a Turn id; an empty or Hook-dropped prompt has none.
export async function createSessionAccepted(
  deps: SessionCreationDeps,
  newSession: SessionNewInput,
  origin?: SessionCreationOrigin,
): Promise<AcceptedSessionStart> {
  const creation = await startSessionCreation(deps, newSession, origin);

  return creation.accepted;
}

// Allocate native identity before waiting for the Agent or the first prompt's admission.
export async function startSessionCreation(
  deps: SessionCreationDeps,
  newSession: SessionNewInput,
  origin?: SessionCreationOrigin,
): Promise<SessionCreation> {
  // The open Sessions machine checks again as the last word (ADR-0003); this check gives the typed failure.
  requireInstalledAgent(deps.installedAgents, newSession.agent);

  const projectPath = await requireCheckoutProjectPath(
    deps.database,
    newSession,
  );

  validateSessionCommandAdmission(deps);
  const sessionId = origin?.sessionId ?? deps.createId();
  const turnId = deps.createId();
  sendCheckedOpenSessionsCommand(deps.sessions, {
    type: 'sessions.create',
    sessionId,
    turnId,
    ...newSession,
    startedBySessionId: origin?.startedBySessionId,
    projectPath,
  });
  const session = requireOpenSessionActor(deps.sessions, sessionId);

  const accepted = observeSessionCreation(
    session,
    completeCreation(deps, session, newSession),
  );

  return { sessionId, turnId, accepted };
}

async function completeCreation(
  deps: SessionCreationDeps,
  session: SessionActorRef,
  input: SessionNewInput,
): Promise<AcceptedSessionStart> {
  await waitForSessionStored(session);
  await waitForSessionInsertCommitted(session);
  const turnId = await startSession(deps, session, input);

  return { sessionId: session.getSnapshot().context.sessionId, turnId };
}

// Once stored, the Session applies its first choices, then submits its first prompt.
async function startSession(
  deps: Pick<SessionRouterDeps, 'hooks'>,
  session: SessionActorRef,
  newSession: SessionNewInput,
): Promise<string | undefined> {
  await applyInitialConfiguration(session, newSession);

  return submitInitialAcpPrompt(session, deps.hooks);
}

// The first prompt passes `prompt.submit` Hooks like any other; a dropped one leaves the Session waiting.
const submitInitialAcpPrompt = async (
  session: SessionActorRef,
  hooks: CoreHooks,
): Promise<string | undefined> => {
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

  return input.turnId;
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
