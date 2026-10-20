import type { FeedSubscribeOutput } from '@repo/contracts';
import type { Subscription } from 'xstate';
import type { FeedDeps } from './feed';
import type { FeedActorRef } from './feed-machine';
import { LiveFeedQueue, type LiveFeedEvent } from './live-feed-queue';
import { StoredChanges } from './stored-changes';

export type ClosedFeed = Extract<FeedSubscribeOutput, { type: 'closed' }>;

type SnapshotEvent = Extract<
  FeedSubscribeOutput,
  { type: 'snapshot' | 'closed' }
>;

const inactiveSubscription: Subscription = { unsubscribe: (): void => {} };

export class FeedListener {
  private readonly live = new LiveFeedQueue();
  private wake: (() => void) | undefined;
  private feed: FeedActorRef | undefined;
  private batches: Subscription = inactiveSubscription;
  private snapshots: Subscription = inactiveSubscription;
  private closed: ClosedFeed | undefined;
  private failure: { error: unknown } | undefined;
  private readonly storedChanges: StoredChanges;
  private readonly wakeOnAbort = (): void => {
    this.wake?.();
  };

  public constructor(
    private readonly sources: FeedDeps,
    private readonly sessionId: string,
    private readonly signal: AbortSignal | undefined,
  ) {
    this.storedChanges = new StoredChanges(sources, sessionId, (resent) =>
      this.receiveLive(resent),
    );
  }

  public start(): void {
    this.snapshots = this.sources.watchSessionSnapshot(this.sessionId, {
      next: (event): void => this.receiveSnapshot(event),
      error: (error): void => {
        this.failure = { error };
        this.wake?.();
      },
    });
    this.watchBatches();
    this.signal?.addEventListener('abort', this.wakeOnAbort);
  }

  public stop(): void {
    this.batches.unsubscribe();
    this.snapshots.unsubscribe();
    this.signal?.removeEventListener('abort', this.wakeOnAbort);
  }

  public throwFailure(): void {
    if (this.failure) throw this.failure.error;
  }

  public isAborted(): boolean {
    return this.signal?.aborted === true;
  }

  public takeOverflow(): boolean {
    return this.live.takeOverflow();
  }

  public shift(): LiveFeedEvent | undefined {
    return this.live.shift();
  }

  // A stored Feed closes right after its snapshot, so the close waits for the Checkout totals.
  public closedEvent(): ClosedFeed | undefined {
    return this.storedChanges.isReading() ? undefined : this.closed;
  }

  public async wait(): Promise<void> {
    await new Promise<void>((resolve): void => {
      this.wake = resolve;
    });
    this.wake = undefined;
  }

  private receiveSnapshot(event: SnapshotEvent): void {
    this.watchBatches();

    if (event.type === 'closed') this.closed = event;
    else this.live.push([this.storedChanges.apply(event)]);
    this.wake?.();
  }

  private receiveLive(events: readonly LiveFeedEvent[]): void {
    this.live.push(events);
    this.wake?.();
  }

  private watchBatches(): void {
    const next = this.sources.findFeed(this.sessionId);

    if (!next || next === this.feed) return;
    this.batches.unsubscribe();
    this.feed = next;
    this.batches = next.on('feed.batch', (batch): void =>
      this.receiveLive(batch.events),
    );
  }
}
