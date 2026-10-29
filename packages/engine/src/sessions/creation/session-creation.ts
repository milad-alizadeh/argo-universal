import type { SessionNewInput, PromptSender } from '@repo/contracts';
import { requireInstalledAgent } from '../../agents';
import type { OpenSessions } from '../open-sessions';
import type { OpenSessionsCommand } from '../open-sessions-machine';
import type { NativeStart, NativeStartRequest } from '../prompt-sender';
import type { SessionActorRef } from '../session-machine';
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

type SessionCreation = NativeStart<AcceptedSessionStart>;

type PreparedCreation = {
  newSession: SessionNewInput;
  // A Session's own id may be allocated first, so a delegation limit can hold its place before it opens.
  origin: NativeStartRequest;
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
  open: OpenSessions,
  session: SessionActorRef,
  prepared: PreparedCreation,
): Promise<AcceptedSessionStart> =>
  observeSessionCreation(
    session,
    completeCreation(open, session, {
      input: prepared.newSession,
      sender: prepared.origin.sender,
    }),
  );

function openCreation(
  open: OpenSessions,
  prepared: PreparedCreation,
): SessionCreation {
  const ids = {
    sessionId: prepared.origin.sessionId ?? open.createId(),
    turnId: open.createId(),
  };

  const session = open.open(creationCommand(prepared, ids));
  const accepted = acceptedFor(open, session, prepared);

  return { ...ids, accepted };
}

// Allocate native identity before waiting for the Agent or the first prompt's admission.
export async function startSessionCreation(
  open: OpenSessions,
  newSession: SessionNewInput,
  origin: NativeStartRequest,
): Promise<SessionCreation> {
  // The open Sessions machine checks again as the last word (ADR-0003); this check gives the typed failure.
  requireInstalledAgent(open.installedAgents, newSession.agent);

  const projectPath = await requireCheckoutProjectPath(
    open.database,
    newSession,
  );

  open.admit(origin.signal);

  return openCreation(open, { newSession, origin, projectPath });
}

async function completeCreation(
  open: OpenSessions,
  session: SessionActorRef,
  initial: { input: SessionNewInput; sender: PromptSender },
): Promise<AcceptedSessionStart> {
  await waitForSessionStored(session);
  await waitForSessionInsertCommitted(session);
  const turnId = await startSession(open.hooks, session, initial);

  return { sessionId: session.getSnapshot().context.sessionId, turnId };
}
