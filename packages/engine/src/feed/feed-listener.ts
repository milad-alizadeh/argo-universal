import type { FeedSubscribeOutput } from '@repo/contracts';
import type { Subscription } from 'xstate';
import type { FeedDeps } from './feed';
import type { FeedActorRef } from './feed-machine';
import { LiveFeedQueue, type LiveFeedEvent } from './live-feed-queue';

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
  private readonly wakeOnAbort = (): void => {
    this.wake?.();
  };

  public constructor(
    private readonly sources: FeedDeps,
    private readonly sessionId: string,
    private readonly signal: AbortSignal | undefined,
  ) {}

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

  public closedEvent(): ClosedFeed | undefined {
    return this.closed;
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
    else this.live.push([event]);
    this.wake?.();
  }

  private watchBatches(): void {
    const next = this.sources.findFeed(this.sessionId);

    if (!next || next === this.feed) return;
    this.batches.unsubscribe();
    this.feed = next;
    this.batches = next.on('feed.batch', (batch): void => {
      this.live.push(batch.events);
      this.wake?.();
    });
  }
}
