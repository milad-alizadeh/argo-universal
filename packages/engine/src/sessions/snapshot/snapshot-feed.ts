import type { Observer, Subscription } from 'xstate';
import type { FeedDeps } from '../../feed';
import { watchSnapshotWriter } from './writer';

type FeedInput = Pick<FeedDeps, 'findFeed' | 'findWriter'>;

type FeedListener = {
  changed: () => void;
  error: NonNullable<Observer<never>['error']>;
  // The Session and the Subagents its last snapshot showed.
  sessionIds: () => readonly string[];
};

// The Feed actor the snapshot reads, and a count of its changes.
export type FeedSources = readonly [ReturnType<FeedDeps['findFeed']>, number];

const feedReadInterval = 60;

// Re-reads on Feed and Writer changes, at most once per read interval.
export class SnapshotFeed {
  private feed: ReturnType<FeedDeps['findFeed']>;
  private listener: Subscription | undefined;
  private writer: Subscription | undefined;
  private version = 0;
  private throttle: ReturnType<typeof setTimeout> | undefined;
  private dirty = false;
  public constructor(
    private readonly input: FeedInput,
    private readonly sessionId: string,
    private readonly notify: FeedListener,
  ) {}

  public watch(): void {
    this.watchWriter();
    const feed = this.input.findFeed(this.sessionId);

    if (!feed) return;

    if (feed === this.feed) return;
    this.unwatch();
    this.feed = feed;
    this.listener = feed.subscribe({
      next: (): void => this.changed(),
      error: (error): void => this.notify.error(error),
    });
  }

  private watchWriter(): void {
    this.writer ??= watchSnapshotWriter(this.input.findWriter(), {
      sessionIds: this.notify.sessionIds,
      changed: (): void => this.changed(),
    });
  }

  private unwatch(): void {
    this.listener?.unsubscribe();
  }

  public unsubscribe(): void {
    this.listener?.unsubscribe();
    this.writer?.unsubscribe();
    clearTimeout(this.throttle);
  }

  public sources(): FeedSources {
    return [this.feed, this.version];
  }

  private changed(): void {
    if (this.throttle) {
      this.dirty = true;

      return;
    }

    this.version += 1;
    this.throttle = setTimeout(
      (): void => this.windowEnded(),
      feedReadInterval,
    );
    this.notify.changed();
  }

  private windowEnded(): void {
    this.throttle = undefined;

    if (!this.dirty) return;
    this.dirty = false;
    this.changed();
  }
}
