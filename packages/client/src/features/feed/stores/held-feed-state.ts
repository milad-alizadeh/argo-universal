import type {
  FeedSyncPoint,
  SessionSnapshot,
  SessionUpdate,
} from '@repo/contracts';
import { emptyFeed, type FeedState, syncPointOf } from '../view/feed-state';
import type { FeedView } from '../view/feed-view';
import { keepUnchangedItems } from '../view/keep-unchanged-items';

// What a Session's held Feed keeps for the next screen that shows the Session.
export interface HeldFeed {
  feed: FeedState;
  snapshot: SessionSnapshot | null;
}

// One Session's place in the App's held Feeds.
export interface HeldSlot {
  read: () => HeldFeed | undefined;
  // Keeps the Session's held Feed until the returned release.
  hold: () => () => void;
  write: (held: HeldFeed) => void;
}

export type FeedConvert = (
  rows: readonly SessionUpdate[],
  snapshot: SessionSnapshot,
) => FeedView;

export interface HeldFeedPorts {
  held: HeldSlot;
  // Runs `run` once at the next frame; the returned function cancels it.
  frame: (run: () => void) => () => void;
  // The row whole, from `feed.row`, when a change could not be applied to it.
  fetchRow: (id: string) => Promise<SessionUpdate>;
  // Pages the tail again after the Server rebuilt the Feed.
  resetHistory: () => Promise<void>;
  convert: FeedConvert;
}

export interface HeldFeedState {
  // The rows committed at the last frame.
  feed: FeedState;
  view: FeedView | null;
  snapshot: SessionSnapshot | null;
  // Where live changes resume (ADR-0007); null until the Feed has rows to resume after.
  syncPoint: FeedSyncPoint | null;
  // The Server closed the Feed, with or without an error to show.
  closed: boolean;
  closureError: Error | null;
}

// The Feed as the last screen that showed the Session left it, or empty.
export function startState(ports: HeldFeedPorts): HeldFeedState {
  const held = ports.held.read() ?? { feed: emptyFeed, snapshot: null };

  return {
    ...held,
    view: viewOf(null, held, ports.convert),
    syncPoint: syncPointOf(held.feed),
    closed: false,
    closureError: null,
  };
}

// The state after `change`; the view is rebuilt only when its rows or snapshot changed.
export function changedState(
  state: HeldFeedState,
  change: Partial<HeldFeedState>,
  convert: FeedConvert,
): HeldFeedState {
  const next = { ...state, ...change };

  if (sameShown(state, next)) return next;

  return { ...next, view: viewOf(state.view, next, convert) };
}

const sameShown = (state: HeldFeed, next: HeldFeed): boolean =>
  state.feed.rows === next.feed.rows && state.snapshot === next.snapshot;

function viewOf(
  previous: FeedView | null,
  { feed, snapshot }: HeldFeed,
  convert: FeedConvert,
): FeedView | null {
  if (!snapshot) return null;

  return keepUnchangedItems(previous, convert(feed.rows, snapshot));
}

// Where live changes resume after the rows held: the open point itself when nothing arrived since.
export function resumedPoint(
  current: FeedSyncPoint | null,
  next: FeedSyncPoint | null,
): FeedSyncPoint | null {
  if (next === null) return current;

  return sameRevision(current, next) ? current : next;
}

function sameRevision(
  current: FeedSyncPoint | null,
  next: FeedSyncPoint,
): boolean {
  return current?.epoch === next.epoch && current.revision === next.revision;
}
