import type {
  ChangesSummary,
  FeedChange,
  PlanUpdate,
  SessionUpdate,
  ToolCallContent,
} from '@repo/contracts';
import type { session } from '@repo/db/schema';
import type { WriterCommit, WriterJob } from '../storage';
import type { MessageStreams } from './acp/message-identity';
import type { AcpSessionNotification as SessionNotification } from './acp/session-notification';
import type { OutputBlob } from './acp/tool-output';
import type { Feed, FeedStreamEvent } from './feed-change';
import type { FeedPublication } from './publication';
import type { SessionRowEvent } from './session-rows';
import type { FeedTurnEnding } from './turn-settlement';

// What the Session reads from its `session` row when it opens.
export interface FeedInput extends Pick<
  typeof session.$inferSelect,
  'epoch' | 'maxRevision'
> {
  sessionId: string;
  rows?: Record<string, SessionUpdate>;
  now: () => number;
  createId: () => string;
  activityAt?: number;
  nextPosition: number;
  findWrittenRow: (id: string) => SessionUpdate | undefined;
  findUnaddressedPlan?: (acpSessionId: string) => PlanUpdate | undefined;
  storageFailing?: () => void;
  refreshChanges?: () => Promise<ChangesSummary>;
}

export interface FeedContext
  extends
    Feed,
    Pick<
      FeedInput,
      | 'epoch'
      | 'findWrittenRow'
      | 'findUnaddressedPlan'
      | 'now'
      | 'createId'
      | 'storageFailing'
      | 'refreshChanges'
    > {
  activityAt: number;
  lastSettledTurnId: string | null;
  changedRowIds: string[];
  streamEvents: FeedStreamEvent[];
  rejectedChanges: number;
  messageStreams: MessageStreams;
  toolContents?: Record<string, ToolCallContent[]>;
  outputBlobs: OutputBlob[];
  changes: ChangesSummary;
  changesRequest: number;
  unaddressedPlan?: { acpSessionId: string; rowId: string };
}

export type FeedEvent =
  | {
      type: 'feed.change';
      change: FeedChange;
      turnId: string | null;
      committed?: WriterCommit;
      blobs?: OutputBlob[];
    }
  | {
      type: 'feed.acpUpdate';
      acpSessionId: SessionNotification['sessionId'];
      update: SessionNotification['update'];
      turnId: string | null;
      stale?: true;
    }
  | {
      type: 'feed.completeTurn';
      turnId: string;
      ending?: FeedTurnEnding;
      commitWith?: WriterJob;
      published?: FeedPublication;
    }
  | SessionRowEvent
  | {
      type: 'feed.changesRefreshed';
      request: number;
      summary: ChangesSummary;
    }
  | { type: 'feed.flush' };

type FeedChangeApplied = {
  type: 'feed.changeApplied';
  settled: boolean;
  commitWith?: WriterJob;
  committed?: WriterCommit;
};

type FeedChangeRejected = {
  type: 'feed.changeRejected';
  reason: string;
};

export type FeedInternalEvent =
  | FeedChangeApplied
  | FeedChangeRejected
  | { type: 'feed.refreshChanges' }
  | { type: 'feed.publish'; published?: FeedPublication };

export type FeedBatch = { type: 'feed.batch'; events: FeedStreamEvent[] };
