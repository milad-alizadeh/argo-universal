import type { SessionSnapshot } from '@repo/contracts';
import type { SnapshotFrom } from 'xstate';
import type { feedMachine } from '../feed/feed-machine';
import type { sessionMachine } from './session-machine';

export function toSessionSnapshot(
  session: SnapshotFrom<typeof sessionMachine> | null,
  feed: {
    context: Pick<
      SnapshotFrom<typeof feedMachine>['context'],
      'epoch' | 'maxRevision'
    >;
  },
): SessionSnapshot {
  const context = session?.context ?? {
    activeTurnId: null,
    usage: null,
    permissionQueue: [],
    pendingElicitation: null,
    configOptions: [],
  };
  const state =
    session?.matches({ open: { live: { running: 'working' } } }) ||
    session?.matches({ open: { live: 'cancelling' } })
      ? 'running'
      : session?.matches({
            open: { live: { running: 'awaitingPermission' } },
          }) ||
          session?.matches({
            open: { live: { running: 'awaitingElicitation' } },
          })
        ? 'requires_action'
        : 'idle';
  return {
    state,
    activeTurnId: context.activeTurnId,
    usage: context.usage,
    pendingPermission: context.permissionQueue[0] ?? null,
    pendingElicitation: context.pendingElicitation,
    configOptions: context.configOptions,
    maxRevision: feed.context.maxRevision,
    epoch: feed.context.epoch,
  };
}
