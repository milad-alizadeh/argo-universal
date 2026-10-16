import type { Subscription, Observer } from 'xstate';
import type { FeedDeps } from '../../../feed';

type FeedInput = Pick<FeedDeps, 'findFeed'>;

type FeedListener = {
  changed: () => void;
  error: NonNullable<Observer<never>['error']>;
};

const feedReadInterval = 60;

export class SnapshotFeed {
  private feed: ReturnType<FeedDeps['findFeed']>;
  private listener: Subscription | undefined;
  private version = 0;
  private throttle: ReturnType<typeof setTimeout> | undefined;
  private dirty = false;
  public constructor(
    private readonly input: FeedInput,
    private readonly sessionId: string,
    private readonly notify: FeedListener,
  ) {}

  public watch(): void {
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

  private unwatch(): void {
    this.listener?.unsubscribe();
  }

  public unsubscribe(): void {
    this.listener?.unsubscribe();
    clearTimeout(this.throttle);
  }

  public sources(): readonly unknown[] {
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
