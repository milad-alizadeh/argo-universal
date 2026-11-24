import type {
  FeedPageInput,
  FeedPageOutput,
  FeedSubscribeOutput,
  FeedSyncPoint,
  SessionSnapshot,
  SessionUpdate,
} from '@repo/contracts';
import type { QueryClient, QueryKey } from '@tanstack/react-query';
import { mergeHistoryPages } from '../view/feed-history';
import { upsertRow } from '../view/feed-row-events';
import {
  applySubscriptionEvent,
  emptyFeed,
  type FeedState,
  mergeNewestPage,
  mergeOlderPage,
  syncPointOf,
} from '../view/feed-state';

const hourMs = 3_600_000;

// The subscription keeps a Feed current, so it never goes stale on a clock; it is kept long enough that a Session seen today opens from here.
export const feedKeptMs = 24 * hourMs;

export const feedKeyPrefix = ['feed', 'window'] as const;

export const snapshotKeyPrefix = ['feed', 'snapshot'] as const;

// The merged window of one Session's Feed: its epoch, revision, rows, older history and Plan.
export const feedKey = (cacheId: string): QueryKey => [
  ...feedKeyPrefix,
  cacheId,
];

// The Session's status snapshot, written beside its rows.
export const snapshotKey = (cacheId: string): QueryKey => [
  ...snapshotKeyPrefix,
  cacheId,
];

export const feedQueryDefaults = {
  staleTime: Infinity,
  gcTime: feedKeptMs,
  // The reducer already makes new objects only for rows that changed.
  structuralSharing: false,
} as const;

export type FeedPageCursor = Pick<
  FeedPageInput,
  'direction' | 'cursor' | 'epoch'
>;

export interface FeedCachePorts {
  // Runs `run` once at the next frame; the returned function cancels it.
  frame: (run: () => void) => () => void;
  fetchPage: (cursor: FeedPageCursor) => Promise<FeedPageOutput>;
  // The row whole, from `feed.row`, when a change could not be applied to it.
  fetchRow: (id: string) => Promise<SessionUpdate>;
}

type RowEvent = Exclude<FeedSubscribeOutput, { type: 'closed' | 'snapshot' }>;

// A row fetched whole joins the same frame as the events around it.
type Held = RowEvent | { type: 'fetched'; row: SessionUpdate };

// Snapshots are plain data from the Server, so equal ones serialize alike.
export const sameSnapshot = (
  held: SessionSnapshot | null | undefined,
  next: SessionSnapshot,
): boolean =>
  held === next ||
  (held !== null &&
    held !== undefined &&
    JSON.stringify(held) === JSON.stringify(next));

export const samePoint = (
  open: FeedSyncPoint | null,
  held: FeedSyncPoint | null,
): boolean =>
  open === held ||
  (open !== null &&
    held !== null &&
    open.epoch === held.epoch &&
    open.revision === held.revision);

export interface Resumption {
  point: FeedSyncPoint | null;
  // The point did not move, so the open subscription must be restarted rather than re-keyed.
  restart: boolean;
}

// Where live changes reopen, on every open, reconnect and return to the foreground: after the newest revision the cache holds (ADR-0007).
export function resumeAfter(
  open: FeedSyncPoint | null,
  held: FeedSyncPoint | null,
): Resumption {
  return { point: held, restart: held !== null && samePoint(open, held) };
}

// One Session's Feed in the App's query cache. Live changes merge into it with the pure event reducer, at most one write per frame (ADR-0007).
export class FeedCache {
  public readonly key: QueryKey;
  public readonly snapshotKey: QueryKey;
  private pending: Held[] = [];
  private pendingSnapshot: SessionSnapshot | null = null;
  private running = false;
  // Tells a showing of the Session from the one before it.
  private run = 0;
  private cancelFrame: (() => void) | undefined;
  private olderInFlight: Promise<void> | undefined;

  public constructor(
    public readonly queryClient: QueryClient,
    public readonly cacheId: string,
    private readonly ports: FeedCachePorts,
  ) {
    this.key = feedKey(cacheId);
    this.snapshotKey = snapshotKey(cacheId);
  }

  public read(): FeedState {
    return this.queryClient.getQueryData<FeedState>(this.key) ?? emptyFeed;
  }

  public readSnapshot(): SessionSnapshot | null {
    return (
      this.queryClient.getQueryData<SessionSnapshot>(this.snapshotKey) ?? null
    );
  }

  // Where live changes resume for the rows held; null before the first page.
  public syncPoint(): FeedSyncPoint | null {
    return syncPointOf(this.read());
  }

  // The Session's tail page, merged into what is held.
  public readonly loadTail = async (): Promise<FeedState> => {
    const page = await this.ports.fetchPage({ direction: 'tail' });

    return mergeNewestPage(this.read(), page);
  };

  // The query that holds the window; observers and a reset share it.
  public tailOptions(): {
    queryKey: QueryKey;
    queryFn: () => Promise<FeedState>;
  } & typeof feedQueryDefaults {
    return { queryKey: this.key, queryFn: this.loadTail, ...feedQueryDefaults };
  }

  // Shows the Session until the returned stop, which drops what arrives after it.
  public start(): () => void {
    if (!this.running) {
      this.running = true;
      this.run += 1;
    }

    return this.stop;
  }

  public isShown(): boolean {
    return this.running;
  }

  public readonly receive = (event: FeedSubscribeOutput): void => {
    if (!this.running || event.type === 'closed') return;

    if (event.type === 'snapshot') return this.holdSnapshot(event.snapshot);

    this.pending.push(event);
    this.scheduleWrite();
  };

  // History pages that are not the Session's own tail, such as a subagent's reports.
  public mergeHistory(pages: readonly FeedPageOutput[]): void {
    if (this.running) this.write(mergeHistoryPages(this.read(), pages));
  }

  // Older rows merge into the same window; a request already in flight is joined.
  public loadOlder(): Promise<void> {
    this.olderInFlight ??= this.fetchOlder().finally(() => {
      this.olderInFlight = undefined;
    });

    return this.olderInFlight;
  }

  private async fetchOlder(): Promise<void> {
    const { epoch, hasOlder, startCursor } = this.read();

    if (epoch === null || !hasOlder || startCursor === null) return;

    const page = await this.ports.fetchPage({
      direction: 'before',
      cursor: startCursor,
      epoch,
    });

    this.write(mergeOlderPage(this.read(), page));
  }

  private readonly stop = (): void => {
    this.running = false;
    this.pending = [];
    this.pendingSnapshot = null;
    this.cancelFrame?.();
    this.cancelFrame = undefined;
  };

  private holdSnapshot(snapshot: SessionSnapshot): void {
    if (sameSnapshot(this.pendingSnapshot ?? this.readSnapshot(), snapshot))
      return;

    this.pendingSnapshot = snapshot;
    this.scheduleWrite();
  }

  private scheduleWrite(): void {
    this.cancelFrame ??= this.ports.frame(() => {
      this.cancelFrame = undefined;
      this.flush();
    });
  }

  // One write for every event the frame gathered.
  private flush(): void {
    const events = this.pending;
    const snapshot = this.pendingSnapshot;
    this.pending = [];
    this.pendingSnapshot = null;

    if (snapshot) this.queryClient.setQueryData(this.snapshotKey, snapshot);

    if (events.length > 0) this.flushRows(events);
  }

  private flushRows(events: readonly Held[]): void {
    const result = events.reduce<Reduction>(reduce, {
      feed: this.read(),
      missing: [],
      reset: false,
    });

    if (result.reset) this.reloadTail();

    this.write(result.feed);

    for (const id of result.missing) void this.fetchMissing(id);
  }

  // The Server rebuilt the Feed: what is held goes, and the tail pages again.
  private reloadTail(): void {
    void this.queryClient.resetQueries({ queryKey: this.key, exact: true });
    void this.queryClient.fetchQuery(this.tailOptions()).catch(() => {});
  }

  private async fetchMissing(id: string): Promise<void> {
    const run = this.run;

    try {
      const row = await this.ports.fetchRow(id);

      if (this.running && run === this.run) {
        this.pending.push({ type: 'fetched', row });
        this.scheduleWrite();
      }
    } catch {
      // The row keeps its last revision until a later change fetches it again.
    }
  }

  private write(feed: FeedState): void {
    if (feed !== this.read()) this.queryClient.setQueryData(this.key, feed);
  }
}

interface Reduction {
  feed: FeedState;
  missing: string[];
  reset: boolean;
}

function reduce(reduction: Reduction, event: Held): Reduction {
  if (event.type === 'fetched')
    return { ...reduction, feed: upsertRow(reduction.feed, event.row) };

  const result = applySubscriptionEvent(reduction.feed, event);

  return {
    feed: result.feed,
    missing: result.missingRowId
      ? [...reduction.missing, result.missingRowId]
      : reduction.missing,
    reset: reduction.reset || result.reset === true,
  };
}
