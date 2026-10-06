import type { SessionSnapshot, SessionUpdate } from '@repo/contracts';
import type { SnapshotFrom } from 'xstate';
import type { feedMachine } from '../feed/feed-machine';
import { toLiveHeader } from './live-header';
import type { sessionMachine } from './session-machine';

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
  // The stored Session row's Agent, title and Checkout.
  record: Pick<SessionSnapshot, 'agent' | 'title' | 'titleSource' | 'checkout'>,
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
    agent: record.agent,
    title: record.title,
    titleSource: record.titleSource,
    checkout: record.checkout,
    state,
    liveHeader: toLiveHeader(context, Object.values(feed.context.rows ?? {})),
    activeTurnId: context.activeTurnId,
    usage: context.usage,
    pendingPermission: context.permissionQueue[0] ?? null,
    pendingElicitation: context.pendingElicitation,
    configOptions: context.configOptions,
    maxRevision: feed.context.maxRevision,
    epoch: feed.context.epoch,
  };
}
