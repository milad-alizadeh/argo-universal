import type { FeedSubscribeOutput } from '@repo/contracts';
import type { Observer, Subscription } from 'xstate';
import type { FeedDeps } from '../feed';
import type { RegistryActorRef } from './registry-machine';
import type { SessionActorRef } from './session-machine';
import { SessionSnapshotReader } from './session-snapshot-reader';

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
  private failed = false;
  private serialized = '';
  private registryListener: Subscription | undefined;
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
    this.unwatchSession();
    this.unwatchFeed();
    this.registryListener?.unsubscribe();
  }

  private watchSession(): void {
    this.sessionListener = this.session?.subscribe({
      next: (): void => this.changed(),
      complete: (): void => this.closed(),
      error: (error): void => this.reject(error),
    });
  }

  private watchRegistry(): void {
    this.registryListener = this.options.sessions?.subscribe({
      next: (): void => this.sessionChanged(),
      error: (error): void => this.reject(error),
      complete: (): void => this.closed(),
    });
  }

  private sessionChanged(): void {
    const session = this.options.findSession(this.sessionId);
    if (session !== this.session) {
      this.unwatchSession();
      this.session = session;
      this.watchSession();
    }
    this.changed();
  }

  private unwatchSession(): void {
    this.sessionListener?.unsubscribe();
  }

  private closed(): void {
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
    this.failed = true;
    this.listener.error?.(error);
  }

  private changed(): void {
    if (this.failed) return;
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
      next: (): void => this.changed(),
      error: (error): void => this.reject(error),
    });
  }

  private unwatchFeed(): void {
    this.feedListener?.unsubscribe();
  }

  private publish(): void {
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
