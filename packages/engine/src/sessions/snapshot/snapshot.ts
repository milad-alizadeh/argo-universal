import { emptyChangesSummary, type SessionSnapshot } from '@repo/contracts';
import { withHeldConfiguration } from '../configuration';
import { toShell } from '../shells';
import { snapshotState, type SessionState } from './state';

// The Live header reader's active Turn and Live header, with the Feed's revision.
export type FeedSnapshot = Pick<
  SessionSnapshot,
  'epoch' | 'maxRevision' | 'liveHeader' | 'activeTurnId'
> & { changes?: SessionSnapshot['changes'] };

export type StoredSnapshot = Pick<
  SessionSnapshot,
  | 'projectId'
  | 'startedBySessionId'
  | 'agent'
  | 'title'
  | 'titleSource'
  | 'archivedAt'
  | 'checkout'
  | 'subagents'
  | 'shells'
>;

type SessionDisplayContext = Pick<
  SessionState['context'],
  | 'usage'
  | 'permissionQueue'
  | 'elicitationQueue'
  | 'configOptions'
  | 'heldConfig'
>;

type StoredFields = Pick<
  SessionSnapshot,
  | 'projectId'
  | 'startedBySessionId'
  | 'agent'
  | 'title'
  | 'titleSource'
  | 'archivedAt'
  | 'checkout'
  | 'subagents'
>;

type SessionFields = Pick<
  SessionSnapshot,
  'usage' | 'pendingPermission' | 'pendingElicitation' | 'configOptions'
>;

const idleContext: SessionDisplayContext = {
  usage: null,
  permissionQueue: [],
  elicitationQueue: [],
  configOptions: [],
  heldConfig: [],
};

export function toSessionSnapshot(
  session: SessionState | null,
  feed: FeedSnapshot,
  stored: StoredSnapshot,
): SessionSnapshot {
  return {
    ...storedFields(stored),
    ...sessionFields(session),
    ...activeTurnFields(session, feed),
    changes: feed.changes ?? emptyChangesSummary,
    maxRevision: feed.maxRevision,
    epoch: feed.epoch,
    shells: session ? liveShells(session) : stored.shells,
  };
}

function storedFields(stored: StoredSnapshot): StoredFields {
  return {
    projectId: stored.projectId,
    startedBySessionId: stored.startedBySessionId,
    agent: stored.agent,
    title: stored.title,
    titleSource: stored.titleSource,
    archivedAt: stored.archivedAt,
    checkout: stored.checkout,
    subagents: stored.subagents,
  };
}

// The Live header and the active Turn it follows, which also runs a Session without a Session actor.
function activeTurnFields(
  session: SessionState | null,
  feed: FeedSnapshot,
): Pick<SessionSnapshot, 'state' | 'activeTurnId' | 'liveHeader'> {
  return {
    state: snapshotState(session, feed.activeTurnId),
    activeTurnId: feed.activeTurnId,
    liveHeader: feed.liveHeader,
  };
}

function sessionFields(session: SessionState | null): SessionFields {
  const context = displayContext(session);

  return {
    usage: context.usage,
    pendingPermission: context.permissionQueue[0] ?? null,
    pendingElicitation: context.elicitationQueue[0] ?? null,
    configOptions: withHeldConfiguration(
      context.configOptions,
      context.heldConfig,
    ),
  };
}

function displayContext(session: SessionState | null): SessionDisplayContext {
  return session?.context ?? idleContext;
}

function liveShells(session: SessionState): SessionSnapshot['shells'] {
  return session.context.shells.map((record) =>
    toShell(record, {
      now: session.context.input.now(),
      terminalAvailable: session.context.shellRuntime.canStop(record.id),
    }),
  );
}
