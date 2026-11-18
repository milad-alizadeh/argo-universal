import type { SessionNewInput, PromptSender } from '@repo/contracts';
import { TRPCError } from '@trpc/server';
import { requireInstalledAgent } from '../../agents';
import type { OpenSessionsCommand } from '../open-sessions-machine';
import type { NativeStart, NativeStartRequest } from '../prompt-sender';
import type { SessionActorRef } from '../session-machine';
import type { HandlerSources } from '../session-sources';
import {
  observeSessionCreation,
  type AcceptedSessionStart,
} from './creation-receipt';
import {
  requireCheckoutProjectPath,
  requireStarter,
} from './session-creation-checkout';
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
    closeFailedCreation,
  );

// A creation that fails leaves nothing behind, as a failed open does: closing discards the Session no Turn reached.
function closeFailedCreation(session: SessionActorRef): void {
  const snapshot = session.getSnapshot();

  if (snapshot.context.kept || !snapshot.can({ type: 'session.close' })) return;
  session.send({ type: 'session.close' });
}

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

// A clean worktree is claimable until the new owner is committed to the database.
const openingBranches = new Set<string>();

function claimBranch(key: string, branch: string): () => void {
  if (openingBranches.has(key))
    throw new TRPCError({
      code: 'CONFLICT',
      message: `A Session is opening on branch ${branch}. Try again when it has opened.`,
    });

  openingBranches.add(key);

  return (): void => {
    openingBranches.delete(key);
  };
}

function openWithClaim(
  sources: CreationSources,
  prepared: PreparedCreation,
  release: () => void,
): SessionCreation {
  try {
    const creation = openCreation(sources, prepared);

    void creation.accepted.then(release, release);

    return creation;
  } catch (error) {
    release();

    throw error;
  }
}

function openWithBranchClaim(
  sources: CreationSources,
  prepared: PreparedCreation,
): SessionCreation {
  const { checkout } = prepared.newSession;

  if (checkout.type !== 'worktree' || !checkout.branch)
    return openCreation(sources, prepared);

  const key = JSON.stringify([prepared.projectPath, checkout.branch]);

  return openWithClaim(sources, prepared, claimBranch(key, checkout.branch));
}

// Allocate native identity before waiting for the Agent or the first prompt's admission.
export async function startSessionCreation(
  sources: CreationSources,
  newSession: SessionNewInput,
  origin: NativeStartRequest,
): Promise<SessionCreation> {
  // The open Sessions machine checks again as the last word (ADR-0003); this check gives the typed failure.
  requireInstalledAgent(sources.installedAgents, newSession.agent);
  requireStarter(newSession, origin.startedBySessionId);

  const projectPath = await requireCheckoutProjectPath(
    sources.database,
    newSession,
  );

  sources.open.admit(origin.signal);

  return openWithBranchClaim(sources, { newSession, origin, projectPath });
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
