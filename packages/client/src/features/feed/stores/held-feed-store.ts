import type { FeedPageOutput, FeedSubscribeOutput } from '@repo/contracts';
import { closedFeedError } from '../utils/closed-feed-error';
import { mergeHistoryPages } from '../view/feed-history';
import { upsertRow } from '../view/feed-row-events';
import {
  applySubscriptionEvent,
  type FeedState,
  syncPointOf,
} from '../view/feed-state';
import {
  changedState,
  type HeldFeedPorts,
  type HeldFeedState,
  resumedPoint,
  startState,
} from './held-feed-state';

type RowEvent = Exclude<FeedSubscribeOutput, { type: 'closed' | 'snapshot' }>;

// One Session's held Feed: history and live changes merge into it, and it commits them at most once per frame (ADR-0007).
export class HeldFeedStore {
  private state: HeldFeedState;
  // The newest rows, committed at the next frame.
  private buffer: FeedState;
  private active = false;
  private cancelFrame: (() => void) | undefined;
  private readonly listeners = new Set<() => void>();

  public constructor(private readonly ports: HeldFeedPorts) {
    this.state = startState(ports);
    this.buffer = this.state.feed;
  }

  public readonly subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);

    return () => void this.listeners.delete(listener);
  };

  public readonly getState = (): HeldFeedState => this.state;

  // Shows the Session until the returned stop; a stopped store drops the frame it held and everything sent to it after.
  public start(): () => void {
    this.active = true;
    const release = this.ports.held.hold();

    return () => {
      this.active = false;
      this.cancelFrame?.();
      this.cancelFrame = undefined;
      release();
    };
  }

  // The history pages fetched so far; the first gives live changes their sync point.
  public mergeHistory(pages: readonly FeedPageOutput[]): void {
    this.whileActive(() => {
      this.replace(mergeHistoryPages(this.buffer, pages));
      this.resumeFromHistory();
    });
  }

  // One value from the Session's `feed.subscribe`.
  public readonly receive = (event: FeedSubscribeOutput): void =>
    this.whileActive(() => this.apply(event));

  // Opens live changes again after the rows held; true when the subscription must restart at the point it already had.
  public retryOpen(): boolean {
    const open = this.state.syncPoint;
    const syncPoint = resumedPoint(open, syncPointOf(this.buffer));
    this.update({ closed: false, closureError: null, syncPoint });

    return syncPoint !== null && syncPoint === open;
  }

  // The one check that drops what arrives for a Session the reader left.
  private whileActive(apply: () => void): void {
    if (this.active) apply();
  }

  private apply(event: FeedSubscribeOutput): void {
    if (event.type === 'closed')
      return this.update({
        closed: true,
        closureError: closedFeedError(event),
      });

    if (event.type === 'snapshot')
      return this.update({ snapshot: event.snapshot });

    this.applyRowEvent(event);
  }

  private applyRowEvent(event: RowEvent): void {
    const result = applySubscriptionEvent(this.buffer, event);
    this.replace(result.feed);

    if (result.missingRowId) void this.fetchRow(result.missingRowId);

    if (result.reset) void this.ports.resetHistory();
  }

  private async fetchRow(id: string): Promise<void> {
    try {
      const row = await this.ports.fetchRow(id);
      this.whileActive(() => this.replace(upsertRow(this.buffer, row)));
    } catch {
      // The row keeps its last revision until a later change fetches it again.
    }
  }

  private resumeFromHistory(): void {
    const syncPoint = this.state.syncPoint ?? syncPointOf(this.buffer);

    if (syncPoint !== this.state.syncPoint) this.update({ syncPoint });
  }

  private replace(feed: FeedState): void {
    this.buffer = feed;
    this.cancelFrame ??= this.ports.frame(() => this.commit());
  }

  private commit(): void {
    this.cancelFrame = undefined;
    this.update({ feed: this.buffer });
  }

  private update(change: Partial<HeldFeedState>): void {
    this.state = changedState(this.state, change, this.ports.convert);

    if (this.state.feed.epoch !== null)
      this.ports.held.write({
        feed: this.state.feed,
        snapshot: this.state.snapshot,
      });

    for (const listener of this.listeners) listener();
  }
}
