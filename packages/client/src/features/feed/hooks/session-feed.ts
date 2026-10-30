import type { SessionSnapshot, ToolCallUpdate } from '@repo/contracts';
import type { ClientError } from '#features/connection';
import type { FeedView } from '../view/feed-view';

export interface SessionFeed {
  loadingOlder: boolean;
  loadOlder: () => Promise<void>;
  view: FeedView | null;
  // The newest Feed revision held, which the reader has seen when the Feed's end is on screen.
  revision: number;
  liveToolCall: ToolCallUpdate | undefined;
  permissionToolCall: ToolCallUpdate | undefined;
  snapshot: SessionSnapshot | null;
  ready: boolean;
  // Paging history failed; a failed older page is not one.
  error: Error | null;
  retry: () => void;
  openError: Error | ClientError | null;
  retryOpen: () => void;
  resumeAfterCommand: () => void;
}
