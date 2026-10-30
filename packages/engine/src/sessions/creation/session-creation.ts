import type { SessionNewInput, PromptSender } from '@repo/contracts';
import { requireInstalledAgent } from '../../agents';
import type { OpenSessionsCommand } from '../open-sessions-machine';
import type { NativeStart, NativeStartRequest } from '../prompt-sender';
import type { SessionActorRef } from '../session-machine';
import type { HandlerSources } from '../session-sources';
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

type CreationSources = HandlerSources<
  'database' | 'createId' | 'installedAgents' | 'hooks',
  'admit' | 'open'
>;

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
  sources: CreationSources,
  session: SessionActorRef,
  prepared: PreparedCreation,
): Promise<AcceptedSessionStart> =>
  observeSessionCreation(
    session,
    completeCreation(sources, session, {
      input: prepared.newSession,
      sender: prepared.origin.sender,
    }),
  );

function openCreation(
  sources: CreationSources,
  prepared: PreparedCreation,
): SessionCreation {
  const ids = {
    sessionId: prepared.origin.sessionId ?? sources.createId(),
    turnId: sources.createId(),
  };

  const session = sources.open.open(creationCommand(prepared, ids));
  const accepted = acceptedFor(sources, session, prepared);

  return { ...ids, accepted };
}

// Allocate native identity before waiting for the Agent or the first prompt's admission.
export async function startSessionCreation(
  sources: CreationSources,
  newSession: SessionNewInput,
  origin: NativeStartRequest,
): Promise<SessionCreation> {
  // The open Sessions machine checks again as the last word (ADR-0003); this check gives the typed failure.
  requireInstalledAgent(sources.installedAgents, newSession.agent);

  const projectPath = await requireCheckoutProjectPath(
    sources.database,
    newSession,
  );

  sources.open.admit(origin.signal);

  return openCreation(sources, { newSession, origin, projectPath });
}

async function completeCreation(
  sources: CreationSources,
  session: SessionActorRef,
  initial: { input: SessionNewInput; sender: PromptSender },
): Promise<AcceptedSessionStart> {
  await waitForSessionStored(session);
  await waitForSessionInsertCommitted(session);
  const turnId = await startSession(sources.hooks, session, initial);

  return { sessionId: session.getSnapshot().context.sessionId, turnId };
}
