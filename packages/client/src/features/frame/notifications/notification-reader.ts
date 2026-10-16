import type {
  FeedPageOutput,
  SessionInfo,
  SessionListUpdate,
} from '@repo/contracts';
import {
  type NotificationBaseline,
  type NotificationClient,
  readNotificationFeed,
} from './notification-feed';
import {
  type SessionNotification,
  notificationBaseline,
  sessionNotifications,
} from './session-notifications';

export class NotificationReader {
  private readonly baselines: Map<string, NotificationBaseline>;
  private readonly pending = new Map<string, SessionInfo>();
  private reading = false;
  private active = false;

  public constructor(
    private readonly client: NotificationClient,
    baseline: NotificationBaseline[],
    private readonly deliver: (notice: SessionNotification) => void,
  ) {
    this.baselines = new Map(
      baseline.map((entry) => [entry.session.sessionId, entry]),
    );
  }

  public setActive(active: boolean): void {
    this.active = active;

    if (!active) this.pending.clear();
  }

  public receive(update: SessionListUpdate): void {
    if (update.type === 'removed') return this.remove(update.sessionId);
    this.pending.set(update.session.sessionId, update.session);
    void this.drain();
  }

  private remove(sessionId: string): void {
    this.pending.delete(sessionId);
    this.baselines.delete(sessionId);
  }

  private async drain(): Promise<void> {
    if (this.reading) return;
    this.reading = true;

    try {
      while (this.hasPending()) await this.readNext();
    } finally {
      this.reading = false;
    }
  }

  private hasPending(): boolean {
    return this.active && this.pending.size > 0;
  }

  private async readNext(): Promise<void> {
    const session = this.pending.values().next().value;

    if (!session) return;
    this.pending.delete(session.sessionId);
    await this.readSession(session).catch(() => {});
  }

  private async readSession(session: SessionInfo): Promise<void> {
    const previous = this.baselines.get(session.sessionId);

    const page = await readNotificationFeed(
      this.client,
      session.sessionId,
      previous,
    );

    this.publish(session, page, previous);
  }

  private latestSession(session: SessionInfo): SessionInfo {
    return this.pending.get(session.sessionId) ?? session;
  }

  private publish(
    observed: SessionInfo,
    page: FeedPageOutput,
    previous: NotificationBaseline | undefined,
  ): void {
    if (!this.active) return;
    const session = this.latestSession(observed);
    this.baselines.set(session.sessionId, notificationBaseline(session, page));

    for (const notice of sessionNotifications(previous, session, page))
      this.deliver(notice);
  }
}
