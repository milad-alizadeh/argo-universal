import type {
  ChangesSummary,
  SessionSnapshot,
  SessionUpdate,
} from '@repo/contracts';
import type { SnapshotFrom } from 'xstate';
import type { feedMachine } from '../../feed';
import type { sessionMachine } from '../session-machine';
import { toLiveHeader } from './live-header';

// The Checkout's changes are computed in #74.
const noChanges: ChangesSummary = {
  files: 0,
  additions: 0,
  deletions: 0,
};

export function isSessionReady(
  session: SnapshotFrom<typeof sessionMachine>,
): boolean {
  return (
    (session.matches({ open: 'acp' }) &&
      !(['opening', 'closing', 'retainingCleanup', 'flushing'] as const).some(
        (state) => session.matches({ open: { acp: state } }),
      )) ||
    (session.context.capabilities !== null &&
      session.matches({ open: 'live' }) &&
      !session.matches({ open: { live: 'starting' } }))
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
  storedSession: Pick<
    SessionSnapshot,
    'agent' | 'title' | 'titleSource' | 'checkout'
  >,
): SessionSnapshot {
  const context = session?.context ?? {
    activeTurnId: null,
    activeTurnStartedAt: null,
    usage: null,
    permissionQueue: [],
    elicitationQueue: [],
    configOptions: [],
  };
  let state: SessionSnapshot['state'] = 'idle';
  if (
    session?.matches({ open: { live: { running: 'awaitingPermission' } } }) ||
    session?.matches({ open: { live: { running: 'awaitingElicitation' } } }) ||
    session?.matches({ open: { acp: { activeTurn: 'awaitingPermission' } } }) ||
    session?.matches({ open: { acp: { activeTurn: 'awaitingElicitation' } } })
  ) {
    state = 'requires_action';
  } else if (
    session?.matches({ open: { live: { running: 'working' } } }) ||
    session?.matches({ open: { live: 'cancelling' } }) ||
    session?.matches({ open: { acp: 'committing' } }) ||
    session?.matches({ open: { acp: 'activeTurn' } }) ||
    session?.matches({ open: { acp: 'publishing' } })
  ) {
    state = 'running';
  }
  return {
    agent: storedSession.agent,
    title: storedSession.title,
    titleSource: storedSession.titleSource,
    checkout: storedSession.checkout,
    state,
    liveHeader: toLiveHeader(context, Object.values(feed.context.rows ?? {})),
    activeTurnId: context.activeTurnId,
    usage: context.usage,
    pendingPermission: context.permissionQueue[0] ?? null,
    pendingElicitation: context.elicitationQueue[0] ?? null,
    pendingPlanProposal: null,
    configOptions: context.configOptions,
    changes: noChanges,
    maxRevision: feed.context.maxRevision,
    epoch: feed.context.epoch,
  };
}
