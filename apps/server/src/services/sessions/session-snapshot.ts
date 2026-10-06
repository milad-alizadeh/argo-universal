import type {
  ChangesSummary,
  SessionSnapshot,
  SessionUpdate,
} from '@repo/contracts';
import type { SnapshotFrom } from 'xstate';
import type { feedMachine } from '../feed/feed-machine';
import { toLiveHeader } from './live-header';
import type { sessionMachine } from './session-machine';

// The Checkout's changes are computed in #74.
export const noChanges: ChangesSummary = {
  files: 0,
  additions: 0,
  deletions: 0,
};

export function isSessionReady(session: SnapshotFrom<typeof sessionMachine>) {
  return (
    session.context.capabilities !== null &&
    !session.matches({ open: { live: 'starting' } }) &&
    !session.matches({ open: { live: 'closing' } }) &&
    !session.matches({ open: 'flushing' })
  );
}

export function toSessionSnapshot(
  session: SnapshotFrom<typeof sessionMachine> | null,
  feed: {
    context: Pick<
      SnapshotFrom<typeof feedMachine>['context'],
      'epoch' | 'maxRevision'
    > & { rows?: Record<string, SessionUpdate> };
  },
  record: Pick<SessionSnapshot, 'title' | 'titleSource'>,
): SessionSnapshot {
  const context = session?.context ?? {
    activeTurnId: null,
    activeTurnStartedAt: null,
    usage: null,
    permissionQueue: [],
    pendingElicitation: null,
    configOptions: [],
  };
  let state: SessionSnapshot['state'] = 'idle';
  if (
    session?.matches({ open: { live: { running: 'working' } } }) ||
    session?.matches({ open: { live: 'cancelling' } })
  ) {
    state = 'running';
  } else if (
    session?.matches({ open: { live: { running: 'awaitingPermission' } } }) ||
    session?.matches({ open: { live: { running: 'awaitingElicitation' } } })
  ) {
    state = 'requires_action';
  }
  return {
    title: record.title,
    titleSource: record.titleSource,
    state,
    liveHeader: toLiveHeader(context, Object.values(feed.context.rows ?? {})),
    activeTurnId: context.activeTurnId,
    usage: context.usage,
    pendingPermission: context.permissionQueue[0] ?? null,
    pendingElicitation: context.pendingElicitation,
    pendingPlanProposal: null,
    configOptions: context.configOptions,
    changes: noChanges,
    maxRevision: feed.context.maxRevision,
    epoch: feed.context.epoch,
  };
}
