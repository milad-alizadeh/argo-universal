import type { Observer, Subscription } from 'xstate';
import type { FeedDeps } from '../../feed';
import type { SessionActorRef } from '../session-machine';
import type { SnapshotEvent, WatchOptions } from './observer';
import { SessionSnapshotReader } from './reader';
import { watchSnapshotWriter } from './writer';

type FeedInput = Pick<FeedDeps, 'findFeed' | 'findWriter'>;

type FeedListener = {
  changed: () => void;
  error: NonNullable<Observer<never>['error']>;
  // The Session and the Subagents its last snapshot showed.
  sessionIds: () => readonly string[];
};

type PublishedSnapshot = Extract<
  SnapshotEvent,
  { type: 'snapshot' }
>['snapshot'];

// The Feed actor the snapshot reads, and a count of its changes.
type FeedSources = readonly [ReturnType<FeedDeps['findFeed']>, number];

const feedReadInterval = 60;

export class SnapshotPublication {
  private serialized = '';
  private feed: FeedSources[0];
  private subagentIds: readonly string[] = [];
  private sources: readonly unknown[] = [];
  private readonly reader: SessionSnapshotReader;
  public constructor(
    options: WatchOptions,
    private readonly sessionId: string,
    private readonly listener: Observer<SnapshotEvent>,
  ) {
    this.reader = new SessionSnapshotReader(options);
  }

  // A new Feed actor is published even when the snapshot reads the same, so the stream reattaches to its batches.
  public publish(
    session: SessionActorRef | undefined,
    feedSources: FeedSources,
  ): boolean {
    const reattached = this.reattached(feedSources[0]);

    if (!this.sourcesChanged(sessionSources(session, feedSources)))
      return false;
    const result = this.reader.read(this.sessionId, session);

    if (!this.isNew(result.snapshot, reattached)) return false;
    this.publishSnapshot(result.snapshot);

    return result.isClosed;
  }

  private isNew(snapshot: PublishedSnapshot, reattached: boolean): boolean {
    const serialized = JSON.stringify(snapshot);

    if (serialized === this.serialized && !reattached) return false;
    this.serialized = serialized;

    return true;
  }

  public sessionIds(): readonly string[] {
    return [this.sessionId, ...this.subagentIds];
  }

  private publishSnapshot(snapshot: PublishedSnapshot): void {
    this.subagentIds = snapshot.subagents.map(
      (subagent): string => subagent.sessionId,
    );
    this.listener.next?.({ type: 'snapshot', snapshot });
  }

  private reattached(feed: FeedSources[0]): boolean {
    const changed = feed !== undefined && feed !== this.feed;

    this.feed = feed;

    return changed;
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
  feedSources: FeedSources,
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
