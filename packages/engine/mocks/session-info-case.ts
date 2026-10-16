import type {
  AgentMessage,
  LiveHeader,
  PlanUpdate,
  SessionRecord,
  Turn,
  PendingPermission,
  PendingElicitation,
} from '@repo/contracts';
import type { PlanApproval } from '../src/sessions';

type LiveSession = {
  activeTurnId: string | null;
  activeTurnStartedAt: number | null;
  permissionQueue: readonly PendingPermission[];
  elicitationQueue: readonly PendingElicitation[];
  planProposal: PlanApproval | null;
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
  activeTurnId: string | null;
  children: readonly SessionRecord[];
}
