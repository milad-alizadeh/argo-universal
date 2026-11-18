import type {
  FeedPageOutput,
  FeedSubscribeOutput,
  SessionSnapshot,
} from '@repo/contracts';
import { StoreListeners } from '../../../lib/store-listeners';
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
  keptFeedChanged,
  resumedPoint,
  sameSnapshot,
  type SessionFeedPorts,
  type SessionFeedState,
  startState,
} from './session-feed-state';

type RowEvent = Exclude<FeedSubscribeOutput, { type: 'closed' | 'snapshot' }>;

// One showing of the Session, from start to stop.
interface Run {
  release: () => void;
}

// One Session's Feed: history and live changes merge into it, and it commits them at most once per frame (ADR-0007).
export class SessionFeedStore {
  private state: SessionFeedState;
  private buffer: FeedState;
  private bufferedSnapshot: SessionSnapshot | null;
  private run: Run | undefined;
  private cancelFrame: (() => void) | undefined;
  private readonly listeners = new StoreListeners();

  public constructor(private ports: SessionFeedPorts) {
    this.state = startState(ports);
    this.buffer = this.state.feed;
    this.bufferedSnapshot = this.state.snapshot;
  }

  // The screen's latest ports, for the same Session.
  public setPorts(ports: SessionFeedPorts): void {
    this.ports = ports;
  }

  public readonly subscribe = this.listeners.subscribe;

  public readonly getState = (): SessionFeedState => this.state;

  // Shows the Session until the returned stop, which drops what arrives after it; starting again commits the rows still held, and opens live changes after them.
  public start(): () => void {
    if (!this.run) {
      this.run = { release: this.ports.kept.retain() };
      this.openAfterHeld();
    }

    if (this.hasHeldChange()) this.scheduleCommit();

    return this.stop;
  }

  // The first pages fetched open live changes after their newest revision.
  public mergeHistory(pages: readonly FeedPageOutput[]): void {
    this.inRun(this.run, () => {
      this.replace(mergeHistoryPages(this.buffer, pages));
      this.resume(false);
    });
  }

  public readonly receive = (event: FeedSubscribeOutput): void =>
    void this.inRun(this.run, () => this.apply(event));

  // True when the subscription must restart at the point it already had.
  public retryOpen(): boolean {
    const open = this.state.syncPoint;
    const retried = this.inRun(this.run, () => this.resume(true));

    return retried && open !== null && this.state.syncPoint === open;
  }

  private readonly stop = (): void => {
    this.run?.release();
    this.run = undefined;
    this.cancelFrame?.();
    this.cancelFrame = undefined;
  };

  // Drops what a stopped run, or one before it, asked for.
  private inRun(run: Run | undefined, apply: () => void): boolean {
    const current = run !== undefined && run === this.run;

    if (current) apply();

    return current;
  }

  private apply(event: FeedSubscribeOutput): void {
    if (event.type === 'closed')
      return this.update({ closure: { error: closedFeedError(event) } });

    if (event.type === 'snapshot') return this.holdSnapshot(event.snapshot);

    this.applyRowEvent(event);
  }

  private applyRowEvent(event: RowEvent): void {
    const result = applySubscriptionEvent(this.buffer, event);
    this.replace(result.feed);

    if (result.missingRowId) void this.fetchRow(result.missingRowId);

    if (result.reset) void this.ports.resetHistory();
  }

  private async fetchRow(id: string): Promise<void> {
    const run = this.run;

    try {
      const row = await this.ports.fetchRow(id);
      this.inRun(run, () => this.replace(upsertRow(this.buffer, row)));
    } catch {
      // The row keeps its last revision until a later change fetches it again.
    }
  }

  private resume(retry: boolean): void {
    const open = this.state.syncPoint;
    const held = syncPointOf(this.buffer);
    const syncPoint = resumedPoint({ open, held, retry });

    if (retry || syncPoint !== open) this.update({ closure: null, syncPoint });
  }

  // A run that follows a stop catches up from the rows held, not from where the first run opened.
  private openAfterHeld(): void {
    const open = this.state.syncPoint;

    if (open === null) return;

    const syncPoint = resumedPoint({
      open,
      held: syncPointOf(this.buffer),
      retry: true,
    });

    if (syncPoint !== open) this.update({ syncPoint });
  }

  // The snapshot waits for the frame with the rows; one equal to the held snapshot is dropped, so nothing downstream sees a change.
  private holdSnapshot(snapshot: SessionSnapshot): void {
    if (sameSnapshot(this.bufferedSnapshot, snapshot)) return;
    this.bufferedSnapshot = snapshot;
    this.scheduleCommit();
  }

  private hasHeldChange(): boolean {
    return (
      this.buffer !== this.state.feed ||
      this.bufferedSnapshot !== this.state.snapshot
    );
  }

  private replace(feed: FeedState): void {
    this.buffer = feed;
    this.scheduleCommit();
  }

  private scheduleCommit(): void {
    this.cancelFrame ??= this.ports.frame(() => {
      this.cancelFrame = undefined;
      this.update({ feed: this.buffer, snapshot: this.bufferedSnapshot });
    });
  }

  private update(change: Partial<SessionFeedState>): void {
    const previous = this.state;
    this.state = changedState(previous, change, this.ports.translate);

    if (keptFeedChanged(previous, this.state))
      this.ports.kept.write({
        feed: this.state.feed,
        snapshot: this.state.snapshot,
      });

    this.listeners.notify();
  }
}
