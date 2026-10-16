import { EventEmitter, on } from 'node:events';
import type { NotificationEvent } from '@repo/contracts';
import type { NotificationAttention } from './attention';
import { notificationQueueLimit, type NotificationOptions } from './options';

interface PendingNotification {
  notification: NotificationEvent;
  expiresAt: number;
  retryAt: number;
}

export class NotificationDelivery {
  private readonly pending = new Map<string, PendingNotification>();
  private readonly changes = new EventEmitter<{ changed: [] }>();
  private readonly stopped = new AbortController();

  public constructor(
    private readonly options: Required<NotificationOptions>,
    private readonly attention: NotificationAttention,
    private readonly enabled: boolean,
  ) {}

  public enqueue(notification: NotificationEvent): void {
    if (!this.enabled) return;
    this.trim();
    this.pending.set(notification.id, {
      notification,
      retryAt: 0,
      expiresAt: Date.now() + this.options.lifetimeMs,
    });
    this.changes.emit('changed');
  }

  public acknowledge(id: string): boolean {
    return this.pending.delete(id);
  }

  public suppress(sessionId: string): void {
    for (const [id, entry] of this.pending)
      if (entry.notification.sessionId === sessionId) this.pending.delete(id);
  }

  public stop(): void {
    this.stopped.abort();
    this.pending.clear();
  }

  public async *events(signal: AbortSignal): AsyncGenerator<NotificationEvent> {
    const combined = AbortSignal.any([signal, this.stopped.signal]);
    const changes = on(this.changes, 'changed', { signal: combined });

    const timer = this.pulse();

    try {
      yield* this.due();

      while (!(await changes.next()).done) yield* this.due();
    } finally {
      clearInterval(timer);
      await changes.return?.();
    }
  }

  private pulse(): ReturnType<typeof setInterval> | undefined {
    if (!this.enabled) return undefined;

    return setInterval(
      () => this.changes.emit('changed'),
      this.options.retryMs,
    );
  }

  private due(): NotificationEvent[] {
    return [...this.pending.values()].flatMap((entry) => {
      const notification = this.ready(entry);

      return notification ? [notification] : [];
    });
  }

  private ready(entry: PendingNotification): NotificationEvent | undefined {
    if (this.discarded(entry)) return undefined;

    if (entry.retryAt > Date.now()) return undefined;
    entry.retryAt = Date.now() + this.options.retryMs;

    return entry.notification;
  }

  private discarded(entry: PendingNotification): boolean {
    const discard =
      entry.expiresAt <= Date.now() ||
      this.attention.includes(entry.notification.sessionId);

    if (discard) this.pending.delete(entry.notification.id);

    return discard;
  }

  private trim(): void {
    if (this.pending.size < notificationQueueLimit) return;
    const first = this.pending.keys().next().value;

    if (first) this.pending.delete(first);
  }
}
