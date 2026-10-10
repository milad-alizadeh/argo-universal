import type { FeedSubscribeOutput } from '@repo/contracts';
import type { Observer, Subscription } from 'xstate';
import type { FeedDeps } from '../feed';
import type { RegistryActorRef } from './registry-machine';
import type { SessionActorRef } from './session-machine';
import { SessionSnapshotReader } from './session-snapshot-reader';

const feedReadInterval = 60;

type SnapshotEvent = Extract<
  FeedSubscribeOutput,
  { type: 'snapshot' | 'closed' }
>;
type WatchOptions = Pick<FeedDeps, 'database' | 'findFeed' | 'findWriter'> & {
  findSession: (sessionId: string) => SessionActorRef | undefined;
  sessions?: RegistryActorRef;
};

export function createSessionSnapshotWatcher(
  options: WatchOptions,
): (sessionId: string, listener: Observer<SnapshotEvent>) => Subscription {
  return function watchSessionSnapshot(sessionId, listener): Subscription {
    return new SessionSnapshotObserver(options, sessionId, listener).start();
  };
}

class SessionSnapshotObserver implements Subscription {
  private session: SessionActorRef | undefined;
  private feed: ReturnType<FeedDeps['findFeed']>;
  private sessionListener: Subscription | undefined;
  private feedListener: Subscription | undefined;
  private hasStopped = false;
  private serialized = '';
  private sources: readonly unknown[] = [];
  private feedVersion = 0;
  private feedThrottle: ReturnType<typeof setTimeout> | undefined;
  private feedDirty = false;
  private registryListener: Subscription | undefined;
  private registeredSessions: unknown;
  private readonly reader: SessionSnapshotReader;

  public constructor(
    private readonly options: WatchOptions,
    private readonly sessionId: string,
    private readonly listener: Observer<SnapshotEvent>,
  ) {
    this.session = options.findSession(sessionId);
    this.reader = new SessionSnapshotReader(options);
  }

  public start(): Subscription {
    this.watchSession();
    this.watchRegistry();
    this.changed();
    return this;
  }

  public unsubscribe(): void {
    this.sessionListener?.unsubscribe();
    this.unwatchFeed();
    this.registryListener?.unsubscribe();
    clearTimeout(this.feedThrottle);
  }

  private watchSession(): void {
    this.sessionListener?.unsubscribe();
    this.sessionListener = this.session?.subscribe({
      next: (): void => this.changed(),
      complete: (): void => this.closed(),
      error: (error): void => this.reject(error),
    });
  }

  private watchRegistry(): void {
    this.registryListener = this.options.sessions?.subscribe({
      next: (registry): void => this.registryChanged(registry.context.sessions),
      error: (error): void => this.reject(error),
      complete: (): void => this.closed(),
    });
  }

  // The registry changes with every Session's every update; only its membership matters here.
  private registryChanged(sessions: unknown): void {
    if (sessions === this.registeredSessions) return;
    this.registeredSessions = sessions;
    this.sessionChanged();
  }

  private sessionChanged(): void {
    const session = this.options.findSession(this.sessionId);
    if (session !== this.session) {
      if (this.finishCurrent()) return;
      this.session = session;
      this.watchSession();
    }
    this.changed();
  }

  private finishCurrent(): boolean {
    return this.session
      ? this.finishSnapshot(this.session.getSnapshot())
      : false;
  }

  private finishSnapshot(
    snapshot: ReturnType<SessionActorRef['getSnapshot']>,
  ): boolean {
    switch (snapshot.status) {
      case 'done':
        this.closed();
        return true;
      case 'error':
        this.reject(snapshot.error);
        return true;
      default:
        return false;
    }
  }

  private closed(): void {
    if (this.hasStopped) return;
    this.hasStopped = true;
    this.listener.next?.({
      type: 'closed',
      failure: this.failure(),
    });
  }

  private failure(): Extract<
    FeedSubscribeOutput,
    { type: 'closed' }
  >['failure'] {
    const output = this.session ? this.session.getSnapshot().output : undefined;
    return output ? output.failure : null;
  }

  private reject(error: unknown): void {
    if (this.hasStopped) return;
    this.hasStopped = true;
    this.listener.error?.(error);
  }

  private changed(): void {
    if (this.hasStopped) return;
    try {
      this.watchFeed();
      this.publish();
    } catch (error) {
      this.reject(error);
    }
  }

  private watchFeed(): void {
    const feed = this.options.findFeed(this.sessionId);
    if (!feed) return;
    if (feed === this.feed) return;
    this.unwatchFeed();
    this.feed = feed;
    this.feedListener = feed.subscribe({
      next: (): void => this.feedChanged(),
      error: (error): void => this.reject(error),
    });
  }

  // A Feed change is read at once, then at most once per Feed batch window, so a burst of Agent updates is not read once per update.
  private feedChanged(): void {
    if (this.feedThrottle) {
      this.feedDirty = true;
      return;
    }
    this.feedVersion += 1;
    this.feedThrottle = setTimeout(
      (): void => this.feedWindowEnded(),
      feedReadInterval,
    );
    this.changed();
  }

  private feedWindowEnded(): void {
    this.feedThrottle = undefined;
    if (!this.feedDirty) return;
    this.feedDirty = false;
    this.feedChanged();
  }

  private unwatchFeed(): void {
    this.feedListener?.unsubscribe();
  }

  // What a snapshot is read from; an unchanged source list skips the read.
  private readSources(): readonly unknown[] {
    const session = this.session?.getSnapshot();
    return [
      this.session,
      session?.status,
      session?.value,
      session?.context,
      this.feed,
      this.feedVersion,
    ];
  }

  private sourcesChanged(): boolean {
    const sources = this.readSources();
    const changed = sources.some(
      (source, index) => source !== this.sources[index],
    );
    this.sources = sources;
    return changed;
  }

  private publish(): void {
    if (!this.sourcesChanged()) return;
    const result = this.reader.read(this.sessionId, this.session);
    const serialized = JSON.stringify(result.snapshot);
    if (serialized === this.serialized) return;
    this.serialized = serialized;
    this.publishSnapshot(result.snapshot);
    if (result.isClosed) this.closed();
  }

  private publishSnapshot(
    snapshot: Extract<SnapshotEvent, { type: 'snapshot' }>['snapshot'],
  ): void {
    this.listener.next?.({ type: 'snapshot', snapshot });
  }
}
