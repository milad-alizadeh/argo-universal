import type {
  FeedPageOutput,
  FeedSyncPoint,
  SessionSnapshot,
  ToolCallUpdate,
} from '@repo/contracts';
import type { ClientError } from '#features/connection';
import type { FeedView } from '../view/feed-view';
import type { useFeedHistory } from './use-feed-history';

type FeedHistory = ReturnType<typeof useFeedHistory>;

export interface SessionFeed {
  loadingOlder: boolean;
  loadOlder: FeedHistory['loadOlder'];
  view: FeedView | null;
  // The newest Feed revision held, which the reader has seen when the Feed's end is on screen.
  revision: number;
  liveToolCall: ToolCallUpdate | undefined;
  permissionToolCall: ToolCallUpdate | undefined;
  snapshot: SessionSnapshot | null;
  ready: boolean;
  error: FeedHistory['error'];
  retry: FeedHistory['refetch'];
  openError: Error | ClientError | null;
  retryOpen: () => void;
  resumeAfterCommand: () => void;
}

// The first history page supplies the revision for opening its live subscription.
export const historySyncPoint = (
  page: FeedPageOutput | undefined,
): FeedSyncPoint | null =>
  page ? { epoch: page.epoch, revision: page.maxRevision } : null;
