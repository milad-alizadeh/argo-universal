import type { SessionInfo, SessionListUpdate } from '@repo/contracts';
import {
  type NotificationBaseline,
  type NotificationClient,
  readBaseline,
  baselineInputId,
  readNotificationFeed,
} from './notification-feed';
import { NotificationInputObserver } from './notification-input-observer';
import { NotificationRetry } from './notification-retry';
import {
  type SessionNotification,
  type SessionNotificationRead,
  isExcluded,
  notificationBaseline,
  sessionNotifications,
} from './session-notifications';

export class NotificationReader {
  private readonly baselines: Map<string, NotificationBaseline>;
  private readonly pending = new Map<string, SessionInfo>();
  private readonly observed = new Map<string, SessionInfo>();
  private readonly excluded = new Set<string>();
  private readonly rebase = new Set<string>();
  private readonly retry = new NotificationRetry();
  private readonly input: NotificationInputObserver;
  private reading = false;
  private active = false;

  public constructor(
    private readonly client: NotificationClient,
    baseline: NotificationBaseline[],
    private readonly deliver: (notice: SessionNotification) => void,
  ) {
    this.input = new NotificationInputObserver(client, deliver);

    for (const entry of baseline)
      if (isExcluded(entry.session)) this.exclude(entry.session.sessionId);
    this.baselines = new Map(
      baseline.map((entry) => [entry.session.sessionId, entry]),
    );
  }

  public setActive(active: boolean): void {
    this.active = active;

    if (!active) this.deactivate();
  }

  private deactivate(): void {
    this.pending.clear();
    this.input.stop();
    this.retry.cancel();
  }

  public receive(update: SessionListUpdate): void {
    if (update.type === 'removed') return this.remove(update.sessionId);

    if (isExcluded(update.session))
      return this.exclude(update.session.sessionId);
    this.enqueue(update.session);
  }

  private enqueue(session: SessionInfo): void {
    if (this.excluded.delete(session.sessionId))
      this.rebase.add(session.sessionId);
    this.observed.set(session.sessionId, session);
    this.pending.set(session.sessionId, session);
    void this.drain();
  }

  private remove(sessionId: string): void {
    this.exclude(sessionId);
    this.baselines.delete(sessionId);
  }

  private exclude(sessionId: string): void {
    this.input.reset(sessionId);
    this.pending.delete(sessionId);
    this.observed.delete(sessionId);
    this.excluded.add(sessionId);
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

    try {
      await this.readSession(session);
      this.retry.reset();
    } catch {
      await this.retrySession(session);
    }
  }

  private async retrySession(session: SessionInfo): Promise<void> {
    const latest = this.observed.get(session.sessionId);

    if (!latest || !this.active) return;
    this.pending.set(latest.sessionId, latest);
    await this.retry.pause();
  }

  private async readSession(session: SessionInfo): Promise<void> {
    if (this.rebase.has(session.sessionId)) return this.restore(session);
    const previous = this.baselines.get(session.sessionId);

    const page = await readNotificationFeed(
      this.client,
      session.sessionId,
      previous,
    );

    const latest = this.observed.get(session.sessionId);

    if (!latest) return;

    this.publish({ session: latest, page, inputId: null }, previous);
  }

  private async restore(session: SessionInfo): Promise<void> {
    const baseline = await readBaseline(this.client, session);
    this.baselines.set(session.sessionId, baseline);
    this.rebase.delete(session.sessionId);

    if (this.canPublish(session)) this.observeInput(session, baseline);
  }

  private publish(
    current: SessionNotificationRead,
    previous: NotificationBaseline | undefined,
  ): void {
    if (!this.canPublish(current.session)) return;
    this.observeInput(current.session, previous);
    this.baselines.set(
      current.session.sessionId,
      notificationBaseline(current),
    );

    for (const notice of sessionNotifications(previous, current))
      this.deliver(notice);
  }
  private canPublish(session: SessionInfo): boolean {
    return this.active && this.observed.has(session.sessionId);
  }

  private observeInput(
    session: SessionInfo,
    previous: NotificationBaseline | undefined,
  ): void {
    if (session.status !== 'needs_input')
      return this.input.reset(session.sessionId);
    this.input.watch(session, baselineInputId(previous));
  }
}
