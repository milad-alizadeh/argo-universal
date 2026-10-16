import type { Observer, Subscription } from 'xstate';
import type { FeedDeps } from '../../feed';
import type { SessionActorRef } from '../session-machine';
import type { SnapshotEvent, WatchOptions } from './observer';
import { SessionSnapshotReader } from './reader';

type FeedInput = Pick<FeedDeps, 'findFeed'>;

type FeedListener = {
  changed: () => void;
  error: NonNullable<Observer<never>['error']>;
};

const feedReadInterval = 60;

export class SnapshotPublication {
  private serialized = '';
  private sources: readonly unknown[] = [];
  private readonly reader: SessionSnapshotReader;
  public constructor(
    options: WatchOptions,
    private readonly sessionId: string,
    private readonly listener: Observer<SnapshotEvent>,
  ) {
    this.reader = new SessionSnapshotReader(options);
  }

  public publish(
    session: SessionActorRef | undefined,
    feedSources: readonly unknown[],
  ): boolean {
    if (!this.sourcesChanged(sessionSources(session, feedSources)))
      return false;
    const result = this.reader.read(this.sessionId, session);
    const serialized = JSON.stringify(result.snapshot);

    if (serialized === this.serialized) return false;
    this.serialized = serialized;
    this.publishSnapshot(result.snapshot);

    return result.isClosed;
  }

  private publishSnapshot(
    snapshot: Extract<SnapshotEvent, { type: 'snapshot' }>['snapshot'],
  ): void {
    this.listener.next?.({ type: 'snapshot', snapshot });
  }

  private sourcesChanged(sources: readonly unknown[]): boolean {
    const changed = sources.some(
      (source, index): boolean => source !== this.sources[index],
    );

    this.sources = sources;

    return changed;
  }
}

function sessionSources(
  actor: SessionActorRef | undefined,
  feedSources: readonly unknown[],
): readonly unknown[] {
  const session = actor?.getSnapshot();

  return [actor, ...snapshotSources(session), ...feedSources];
}

function snapshotSources(
  session: ReturnType<SessionActorRef['getSnapshot']> | undefined,
): readonly unknown[] {
  return session
    ? [session.status, session.value, session.context]
    : [undefined, undefined, undefined];
}

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
