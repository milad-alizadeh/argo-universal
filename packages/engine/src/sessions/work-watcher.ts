import type { Observer, Subscription } from 'xstate';
import type { FeedActorRef } from '../feed';
import type { OpenSessions } from './open-sessions';
import type { SessionActorRef } from './session-machine';
import { onWriterChange } from './writer-changes';

export type SessionWorkWatcher = (
  sessionId: string,
  listener: Observer<void>,
) => Subscription;

type WorkActor = { subscribe: (listener: Observer<unknown>) => Subscription };

// Observes native Session work before storage exists, and through queued commits and close.
export function createSessionWorkWatcher(
  deps: OpenSessions,
): SessionWorkWatcher {
  return (sessionId, listener) =>
    new WorkWatcher(deps, sessionId, listener).start();
}

class WorkWatcher implements Subscription {
  private session: SessionActorRef | undefined;
  private feed: FeedActorRef | undefined;
  private sessionListener: Subscription | undefined;
  private feedListener: Subscription | undefined;
  private readonly subscriptions = new Set<Subscription>();
  public constructor(
    private readonly deps: OpenSessions,
    private readonly sessionId: string,
    private readonly listener: Observer<void>,
  ) {}
  public start(): Subscription {
    this.subscriptions.add(
      this.deps.subscribe({
        next: this.changed,
        error: this.listener.error,
        complete: this.listener.complete,
      }),
    );
    const writer = this.deps.findWriter();

    if (writer) this.subscriptions.add(onWriterChange(writer, this.changed));
    this.refresh();

    return this;
  }
  public unsubscribe(): void {
    for (const subscription of this.subscriptions) subscription.unsubscribe();
    this.subscriptions.clear();
  }
  private readonly changed = (): void => {
    this.refresh();
    this.listener.next?.();
  };
  private refresh(): void {
    const session = this.deps.session(this.sessionId);

    const feed = this.deps.findFeed(this.sessionId);

    if (session !== this.session) this.watchSession(session);

    if (feed !== this.feed) this.watchFeed(feed);
  }
  private watchSession(session: SessionActorRef | undefined): void {
    this.forget(this.sessionListener);
    this.session = session;
    this.sessionListener = this.listen(session);
  }
  private watchFeed(feed: FeedActorRef | undefined): void {
    this.forget(this.feedListener);
    this.feed = feed;
    this.feedListener = this.listen(feed);
  }
  private forget(subscription: Subscription | undefined): void {
    if (!subscription) return;
    subscription.unsubscribe();
    this.subscriptions.delete(subscription);
  }
  private listen(actor: WorkActor | undefined): Subscription | undefined {
    if (!actor) return undefined;

    const subscription = actor.subscribe({
      next: this.changed,
      error: this.listener.error,
      complete: this.changed,
    });

    this.subscriptions.add(subscription);

    return subscription;
  }
}
