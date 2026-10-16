import type {
  NotificationStreamEvent,
  NotificationEvent,
} from '@repo/contracts';
import type { AppRouter } from '@repo/engine/router';
import type { TRPCClient } from '@trpc/client';

// The two Server calls the consumer makes; the tRPC client satisfies it.
export interface NotificationClient {
  notifications: Pick<
    TRPCClient<AppRouter>['notifications'],
    'attention' | 'acknowledge'
  >;
}

type Deliver = (notification: NotificationEvent) => boolean;

const displayedNotificationLimit = 2048;

export class NotificationConsumer {
  private readonly displayed = new Set<string>();
  private sessionId: string | null = null;
  private heartbeat: ReturnType<typeof setInterval> | undefined;
  private active = false;
  private ready = false;

  public constructor(
    private readonly client: NotificationClient,
    private readonly deliver: Deliver,
  ) {}

  public start(): void {
    this.active = true;
  }

  public stop(): void {
    this.active = false;
    this.disconnected();
  }

  public disconnected(): void {
    this.ready = false;
    clearInterval(this.heartbeat);
  }

  public attention(sessionId: string | null): void {
    this.sessionId = sessionId;
    this.report();
  }

  public receive(event: NotificationStreamEvent): void {
    if (!this.active) return;

    if (event.type === 'ready') return this.connected(event.heartbeatMs);
    this.notification(event.notification);
  }

  private connected(heartbeatMs: number): void {
    this.ready = true;
    clearInterval(this.heartbeat);
    this.report();
    this.heartbeat = setInterval(() => this.report(), heartbeatMs);
  }

  private report(): void {
    if (!this.ready) return;
    void this.client.notifications.attention
      .mutate({ sessionId: this.sessionId })
      .catch(() => {});
  }

  private notification(notification: NotificationEvent): void {
    const key = `${notification.serverId}:${notification.id}`;

    if (this.displayed.has(key)) return this.acknowledge(notification.id);

    if (!this.deliver(notification)) return;
    this.remember(key);
    this.acknowledge(notification.id);
  }

  private acknowledge(id: string): void {
    void this.client.notifications.acknowledge.mutate({ id }).catch(() => {});
  }

  private remember(key: string): void {
    this.displayed.add(key);

    if (this.displayed.size <= displayedNotificationLimit) return;
    const first = this.displayed.values().next().value;

    if (first) this.displayed.delete(first);
  }
}
