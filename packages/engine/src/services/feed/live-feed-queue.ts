import type { FeedSnapshot } from '@repo/contracts';
import type { FeedStreamEvent } from './feed-change';

export type LiveFeedEvent = FeedStreamEvent | FeedSnapshot;

const liveEventLimit = 2048;

const isSnapshot = (event: LiveFeedEvent | undefined): event is FeedSnapshot =>
  event?.type === 'snapshot';

// One subscriber's undelivered live events: past the limit its row changes give way to a catch-up from storage, and the newest Session snapshot stays.
export class LiveFeedQueue {
  private events: LiveFeedEvent[] = [];
  private hasOverflowed = false;

  public push(events: readonly LiveFeedEvent[]): void {
    for (const event of events) this.append(event);
    if (this.events.length > liveEventLimit) this.overflow();
  }

  public shift(): LiveFeedEvent | undefined {
    return this.events.shift();
  }

  // True once after row changes were dropped, so the subscriber catches up from its last delivered revision.
  public takeOverflow(): boolean {
    const hasOverflowed = this.hasOverflowed;
    this.hasOverflowed = false;
    return hasOverflowed;
  }

  private append(event: LiveFeedEvent): void {
    if (isSnapshot(event) && isSnapshot(this.events.at(-1)))
      this.events[this.events.length - 1] = event;
    else this.events.push(event);
  }

  private overflow(): void {
    this.hasOverflowed = true;
    this.events = this.events.filter(isSnapshot).slice(-1);
  }
}
