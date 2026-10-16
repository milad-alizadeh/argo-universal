import type {
  ChangesSummary,
  SessionSnapshot,
  SessionUpdate,
} from '@repo/contracts';
import { toShell } from '../acp/shells/shells';
import { withHeldConfiguration } from '../configuration/held-configuration';
import { toLiveHeader } from '../live-header';
import { snapshotState, type SessionState } from './state';

export type FeedSnapshot = Pick<SessionSnapshot, 'epoch' | 'maxRevision'> & {
  rows: Record<string, SessionUpdate>;
};

export type StoredSnapshot = Pick<
  SessionSnapshot,
  | 'projectId'
  | 'agent'
  | 'title'
  | 'titleSource'
  | 'checkout'
  | 'subagents'
  | 'shells'
>;

type SessionDisplayContext = Pick<
  SessionState['context'],
  | 'activeTurnId'
  | 'activeTurnStartedAt'
  | 'usage'
  | 'permissionQueue'
  | 'elicitationQueue'
  | 'configOptions'
  | 'heldConfig'
>;

type StoredFields = Pick<
  SessionSnapshot,
  | 'projectId'
  | 'agent'
  | 'title'
  | 'titleSource'
  | 'checkout'
  | 'changes'
  | 'subagents'
>;

type SessionFields = Pick<
  SessionSnapshot,
  | 'state'
  | 'activeTurnId'
  | 'usage'
  | 'pendingPermission'
  | 'pendingElicitation'
  | 'pendingPlanProposal'
  | 'configOptions'
>;

type FeedFields = Pick<SessionSnapshot, 'liveHeader' | 'maxRevision' | 'epoch'>;

const noChanges: ChangesSummary = { files: 0, additions: 0, deletions: 0 };

const idleContext: SessionDisplayContext = {
  activeTurnId: null,
  activeTurnStartedAt: null,
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
    ...feedFields(session, feed),
    shells: session ? liveShells(session) : stored.shells,
  };
}

function storedFields(stored: StoredSnapshot): StoredFields {
  return {
    projectId: stored.projectId,
    agent: stored.agent,
    title: stored.title,
    titleSource: stored.titleSource,
    checkout: stored.checkout,
    changes: noChanges,
    subagents: stored.subagents,
  };
}

function sessionFields(session: SessionState | null): SessionFields {
  const context = displayContext(session);

  return {
    state: snapshotState(session),
    activeTurnId: context.activeTurnId,
    usage: context.usage,
    pendingPermission: context.permissionQueue[0] ?? null,
    pendingElicitation: context.elicitationQueue[0] ?? null,
    pendingPlanProposal: null,
    configOptions: withHeldConfiguration(
      context.configOptions,
      context.heldConfig,
    ),
  };
}

function feedFields(
  session: SessionState | null,
  feed: FeedSnapshot,
): FeedFields {
  return {
    liveHeader: toLiveHeader(displayContext(session), Object.values(feed.rows)),
    maxRevision: feed.maxRevision,
    epoch: feed.epoch,
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
