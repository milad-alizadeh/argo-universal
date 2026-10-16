import type { FeedSubscribeOutput, SessionInfo } from '@repo/contracts';
import type { NotificationClient } from './notification-feed';
import { inputRequestChanged, pendingInputId } from './notification-input';
import type { SessionNotification } from './session-notifications';

interface InputWatch {
  session: SessionInfo;
  subscription: { unsubscribe: () => void };
}

export class NotificationInputObserver {
  private readonly watches = new Map<string, InputWatch>();
  private readonly requestIds = new Map<string, string | null>();

  public constructor(
    private readonly client: NotificationClient,
    private readonly deliver: (notice: SessionNotification) => void,
  ) {}

  public watch(session: SessionInfo, initialId: string | null): void {
    const existing = this.watches.get(session.sessionId);

    if (existing) {
      existing.session = session;

      return;
    }

    if (!this.requestIds.has(session.sessionId))
      this.requestIds.set(session.sessionId, initialId);
    this.subscribe(session);
  }

  private subscribe(session: SessionInfo): void {
    const subscription = this.client.feed.subscribe.subscribe(
      { sessionId: session.sessionId, after: null },
      {
        onData: (event) => this.receive(session.sessionId, event),
        onError: () => this.unsubscribe(session.sessionId),
      },
    );

    this.watches.set(session.sessionId, { session, subscription });
  }

  private receive(sessionId: string, event: FeedSubscribeOutput): void {
    if (event.type !== 'snapshot') return;
    const previous = this.requestIds.get(sessionId);
    const next = pendingInputId(event.snapshot);
    this.requestIds.set(sessionId, next);

    if (inputRequestChanged(previous, next)) this.notify(sessionId);
  }

  private notify(sessionId: string): void {
    const watch = this.watches.get(sessionId);

    if (watch)
      this.deliver({ session: watch.session, body: 'Needs your input' });
  }

  private unsubscribe(sessionId: string): void {
    this.watches.get(sessionId)?.subscription.unsubscribe();
    this.watches.delete(sessionId);
  }

  public reset(sessionId: string): void {
    this.unsubscribe(sessionId);
    this.requestIds.delete(sessionId);
  }

  public stop(): void {
    for (const sessionId of this.watches.keys()) this.unsubscribe(sessionId);
  }
}
