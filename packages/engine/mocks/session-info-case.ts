import type {
  AgentMessage,
  LiveHeader,
  PlanUpdate,
  SessionRecord,
  Turn,
  PendingPermission,
  PendingElicitation,
} from '@repo/contracts';

type LiveSession = {
  activeTurnId: string | null;
  activeTurnStartedAt: number | null;
  permissionQueue: readonly PendingPermission[];
  elicitationQueue: readonly PendingElicitation[];
  failure: string | null;
};

export interface SessionInfoFixture {
  row: SessionRecord;
  turns: readonly Turn[];
  message: AgentMessage | undefined;
  plan: PlanUpdate | undefined;
  live: LiveSession | null;
  feed: { maxRevision: number; activityAt: number } | null;
  liveHeader: LiveHeader | null;
  children: readonly SessionRecord[];
}
