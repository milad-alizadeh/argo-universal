import type { SessionSnapshot } from '@repo/contracts';
import { withHeldConfiguration } from '../configuration/held-configuration';
import { toLiveHeader } from '../live-header';
import { snapshotState } from './state';
import type {
  SessionState,
  SessionDisplayContext,
  SnapshotFeed,
} from './types';

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

export function sessionSnapshotFields(
  session: SessionState | null,
): SessionFields {
  const context = displayContext(session);

  return {
    state: snapshotState(session),
    activeTurnId: context.activeTurnId,
    usage: context.usage,
    ...pendingRequests(context),
    pendingPlanProposal: null,
    configOptions: configurationOptions(context),
  };
}

export function feedSnapshotFields(
  session: SessionState | null,
  feed: SnapshotFeed,
): FeedFields {
  return {
    liveHeader: toLiveHeader(
      displayContext(session),
      Object.values(feed.context.rows ?? {}),
    ),
    maxRevision: feed.context.maxRevision,
    epoch: feed.context.epoch,
  };
}

function pendingRequests(
  context: SessionDisplayContext,
): Pick<SessionSnapshot, 'pendingPermission' | 'pendingElicitation'> {
  return {
    pendingPermission: context.permissionQueue[0] ?? null,
    pendingElicitation: context.elicitationQueue[0] ?? null,
  };
}

function displayContext(session: SessionState | null): SessionDisplayContext {
  return session?.context ?? idleContext;
}

const idleContext: SessionDisplayContext = {
  activeTurnId: null,
  activeTurnStartedAt: null,
  usage: null,
  permissionQueue: [],
  elicitationQueue: [],
  configOptions: [],
  heldConfig: [],
};

function configurationOptions(
  context: SessionDisplayContext,
): SessionSnapshot['configOptions'] {
  return withHeldConfiguration(context.configOptions, context.heldConfig);
}
