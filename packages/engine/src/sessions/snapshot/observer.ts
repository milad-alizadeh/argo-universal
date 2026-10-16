import type { FeedSubscribeOutput } from '@repo/contracts';
import type { Observer, Subscription } from 'xstate';
import type { FeedDeps } from '../../feed';
import type { OpenSessionsActorRef } from '../open-sessions-machine';
import type { SessionActorRef } from '../session-machine';
import { SnapshotFeed } from './feed';
import { SnapshotPublication } from './publication';

export type SnapshotEvent = Extract<
  FeedSubscribeOutput,
  { type: 'snapshot' | 'closed' }
>;

export type WatchOptions = Pick<
  FeedDeps,
  'database' | 'findFeed' | 'findWriter'
> & {
  findSession: (sessionId: string) => SessionActorRef | undefined;
  sessions?: OpenSessionsActorRef;
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
  private sessionListener: Subscription | undefined;
  private hasStopped = false;
  private readonly feed: SnapshotFeed;
  private readonly publication: SnapshotPublication;
  private openSessionsListener: Subscription | undefined;
  private registeredSessions: Record<string, SessionActorRef> | undefined;

  public constructor(
    private readonly options: WatchOptions,
    private readonly sessionId: string,
    private readonly listener: Observer<SnapshotEvent>,
  ) {
    this.session = options.findSession(sessionId);
    this.feed = new SnapshotFeed(options, sessionId, {
      changed: (): void => this.changed(),
      error: (error): void => this.reject(error),
    });
    this.publication = new SnapshotPublication(options, sessionId, listener);
  }

  public start(): Subscription {
    this.watchSession();
    this.watchOpenSessions();
    this.changed();

    return this;
  }

  public unsubscribe(): void {
    this.sessionListener?.unsubscribe();
    this.feed.unsubscribe();
    this.openSessionsListener?.unsubscribe();
  }

  private watchSession(): void {
    this.sessionListener?.unsubscribe();
    this.sessionListener = this.session?.subscribe({
      next: (): void => this.changed(),
      complete: (): void => this.closed(),
      error: (error): void => this.reject(error),
    });
  }

  private watchOpenSessions(): void {
    this.openSessionsListener = this.options.sessions?.subscribe({
      next: (snapshot): void =>
        this.openSessionsChanged(snapshot.context.sessions),
      error: (error): void => this.reject(error),
      complete: (): void => this.closed(),
    });
  }

  // Parent updates can replace a Subagent's Feed without changing registry membership.
  private openSessionsChanged(sessions: Record<string, SessionActorRef>): void {
    if (sessions === this.registeredSessions) return this.changed();
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
    this.listener.next?.(this.closedEvent());
  }

  private closedEvent(): Extract<FeedSubscribeOutput, { type: 'closed' }> {
    const event: Extract<FeedSubscribeOutput, { type: 'closed' }> = {
      type: 'closed',
      failure: this.failure(),
    };

    const openError = this.session?.getSnapshot().context.openError;

    if (openError) event.openError = openError;

    return event;
  }

  private failure(): Extract<
    FeedSubscribeOutput,
    { type: 'closed' }
  >['failure'] {
    const output = this.session ? this.session.getSnapshot().output : undefined;

    return output ? output.failure : null;
  }

  private reject(cause: unknown): void {
    if (this.hasStopped) return;
    this.hasStopped = true;
    this.listener.error?.(cause);
  }

  private publish(): void {
    if (this.publication.publish(this.session, this.feed.sources()))
      this.closed();
  }

  private canPublish(): boolean {
    return !this.hasStopped && !this.finishCurrent();
  }

  private changed(): void {
    if (!this.canPublish()) return;

    try {
      this.feed.watch();

      this.publish();
    } catch (error) {
      this.reject(error);
    }
  }
}
