import type {
  FeedSyncPoint,
  SessionSnapshot,
  SessionUpdate,
} from '@repo/contracts';
import { emptyFeed, type FeedState, syncPointOf } from '../view/feed-state';
import type { FeedView } from '../view/feed-view';
import { keepUnchangedItems } from '../view/keep-unchanged-items';

// What the App keeps of a Session's Feed, so the next screen that shows the Session starts from it.
export interface KeptFeed {
  feed: FeedState;
  snapshot: SessionSnapshot | null;
}

// One Session's entry among the App's kept Feeds.
export interface KeptFeedSlot {
  read: () => KeptFeed | undefined;
  // Keeps the entry until the returned release.
  retain: () => () => void;
  write: (kept: KeptFeed) => void;
}

// Translates Feed rows to the Feed view, such as the Session's own or a subagent's.
export type FeedViewTranslator = (
  rows: readonly SessionUpdate[],
  snapshot: SessionSnapshot,
) => FeedView;

export interface SessionFeedPorts {
  kept: KeptFeedSlot;
  // Runs `run` once at the next frame; the returned function cancels it.
  frame: (run: () => void) => () => void;
  // The row whole, from `feed.row`, when a change could not be applied to it.
  fetchRow: (id: string) => Promise<SessionUpdate>;
  // Pages the tail again after the Server rebuilt the Feed.
  resetHistory: () => Promise<void>;
  translate: FeedViewTranslator;
}

// The Server closed the Feed, with or without an error to show.
export type FeedClosure = { error: Error | null } | null;

export interface SessionFeedState {
  // The rows committed at the last frame.
  feed: FeedState;
  view: FeedView | null;
  snapshot: SessionSnapshot | null;
  // Where live changes resume (ADR-0007); null until the Feed has rows to resume after.
  syncPoint: FeedSyncPoint | null;
  closure: FeedClosure;
}

export function startState(ports: SessionFeedPorts): SessionFeedState {
  const kept = ports.kept.read() ?? { feed: emptyFeed, snapshot: null };

  return {
    ...kept,
    view: viewOf(null, kept, ports.translate),
    syncPoint: syncPointOf(kept.feed),
    closure: null,
  };
}

// The view is translated again only when its rows or snapshot changed.
export function changedState(
  state: SessionFeedState,
  change: Partial<SessionFeedState>,
  translate: FeedViewTranslator,
): SessionFeedState {
  const next = { ...state, ...change };

  if (sameShown(state, next)) return next;

  return { ...next, view: viewOf(state.view, next, translate) };
}

const sameShown = (state: KeptFeed, next: KeptFeed): boolean =>
  state.feed.rows === next.feed.rows && state.snapshot === next.snapshot;

// A later screen starts from the committed rows and snapshot, once they have an epoch.
export const keptFeedChanged = (previous: KeptFeed, next: KeptFeed): boolean =>
  next.feed.epoch !== null &&
  (previous.feed !== next.feed || previous.snapshot !== next.snapshot);

function viewOf(
  previous: FeedView | null,
  { feed, snapshot }: KeptFeed,
  translate: FeedViewTranslator,
): FeedView | null {
  if (!snapshot) return null;

  return keepUnchangedItems(previous, translate(feed.rows, snapshot));
}

interface Resume {
  open: FeedSyncPoint | null;
  held: FeedSyncPoint | null;
  retry: boolean;
}

// Live changes keep the point they opened at; the first rows open one, and a retry moves it to the rows held.
export function resumedPoint({
  open,
  held,
  retry,
}: Resume): FeedSyncPoint | null {
  if (!retry && open !== null) return open;

  return newerPoint(open, held);
}

function newerPoint(
  open: FeedSyncPoint | null,
  held: FeedSyncPoint | null,
): FeedSyncPoint | null {
  if (held === null) return open;

  return sameRevision(open, held) ? open : held;
}

function sameRevision(
  open: FeedSyncPoint | null,
  held: FeedSyncPoint,
): boolean {
  return open?.epoch === held.epoch && open.revision === held.revision;
}
