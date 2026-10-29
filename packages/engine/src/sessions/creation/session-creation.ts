import type { SessionNewInput, PromptSender } from '@repo/contracts';
import { requireInstalledAgent } from '../../agents';
import type { OpenSessionsCommand } from '../open-sessions-machine';
import type { NativeStart, SessionOrigin } from '../prompt-sender';
import type { SessionRouterDeps } from '../router-deps';
import { validateSessionCommandAdmission } from '../session-command';
import type { SessionActorRef } from '../session-machine';
import {
  requireOpenSessionActor,
  sendCheckedOpenSessionsCommand,
} from '../session-opening';
import {
  observeSessionCreation,
  type AcceptedSessionStart,
} from './creation-receipt';
import { requireCheckoutProjectPath } from './session-creation-checkout';
import { startSession } from './session-creation-start';
import {
  waitForSessionInsertCommitted,
  waitForSessionStored,
} from './session-creation-wait';

type SessionCreationDeps = Pick<
  SessionRouterDeps,
  | 'database'
  | 'sessions'
  | 'createId'
  | 'sessionCommandSignal'
  | 'installedAgents'
  | 'hooks'
>;

// A Session's own id may be allocated first, so a delegation limit can hold its place before it opens.
type SessionCreationOrigin = SessionOrigin & { sessionId?: string };

type SessionCreation = NativeStart<AcceptedSessionStart>;

type PreparedCreation = {
  newSession: SessionNewInput;
  origin: SessionCreationOrigin;
  projectPath: string;
};

type CreationIds = { sessionId: string; turnId: string };

const creationCommand = (
  { newSession, origin, projectPath }: PreparedCreation,
  ids: CreationIds,
): Extract<OpenSessionsCommand, { type: 'sessions.create' }> => ({
  type: 'sessions.create',
  ...ids,
  ...newSession,
  startedBySessionId: origin.startedBySessionId ?? undefined,
  projectPath,
});

const acceptedFor = (
  deps: SessionCreationDeps,
  session: SessionActorRef,
  prepared: PreparedCreation,
): Promise<AcceptedSessionStart> =>
  observeSessionCreation(
    session,
    completeCreation(deps, session, {
      input: prepared.newSession,
      sender: prepared.origin.sender,
    }),
  );

function openCreation(
  deps: SessionCreationDeps,
  prepared: PreparedCreation,
): SessionCreation {
  const ids = {
    sessionId: prepared.origin.sessionId ?? deps.createId(),
    turnId: deps.createId(),
  };

  sendCheckedOpenSessionsCommand(deps.sessions, creationCommand(prepared, ids));

  const session = requireOpenSessionActor(deps.sessions, ids.sessionId);
  const accepted = acceptedFor(deps, session, prepared);

  return { ...ids, accepted };
}

// Allocate native identity before waiting for the Agent or the first prompt's admission.
export async function startSessionCreation(
  deps: SessionCreationDeps,
  newSession: SessionNewInput,
  origin: SessionCreationOrigin,
): Promise<SessionCreation> {
  // The open Sessions machine checks again as the last word (ADR-0003); this check gives the typed failure.
  requireInstalledAgent(deps.installedAgents, newSession.agent);

  const projectPath = await requireCheckoutProjectPath(
    deps.database,
    newSession,
  );

  validateSessionCommandAdmission(deps);

  return openCreation(deps, { newSession, origin, projectPath });
}

async function completeCreation(
  deps: SessionCreationDeps,
  session: SessionActorRef,
  initial: { input: SessionNewInput; sender: PromptSender },
): Promise<AcceptedSessionStart> {
  await waitForSessionStored(session);
  await waitForSessionInsertCommitted(session);
  const turnId = await startSession(deps, session, initial);

  return { sessionId: session.getSnapshot().context.sessionId, turnId };
}
