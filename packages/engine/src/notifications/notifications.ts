import type {
  NotificationStreamEvent,
  NotificationEvent,
} from '@repo/contracts';
import type { RpcConnection } from '../rpc';
import { NotificationAttention } from './attention';
import { NotificationDelivery } from './delivery';
import { type NotificationFact, notificationId } from './facts';
import {
  type NotificationOptions,
  notificationOptions,
  recentNotificationLimit,
} from './options';
import {
  NotificationSourcesObserver,
  type NotificationSources,
} from './sources';

interface Destination {
  connection: RpcConnection;
  delivery: NotificationDelivery;
  disconnect: () => void;
}

export interface NotificationsInput extends NotificationSources {
  serverId: string;
  notificationOptions?: NotificationOptions;
}

export class Notifications {
  private readonly destinations = new Map<string, Destination>();
  private readonly recent = new Set<string>();
  private readonly options: Required<NotificationOptions>;
  private readonly attention: NotificationAttention;
  private readonly stopSources: () => void;

  public constructor(private readonly input: NotificationsInput) {
    this.options = notificationOptions(input.notificationOptions);
    this.attention = new NotificationAttention(
      this.options.attentionLeaseMs,
      this.options.now,
    );
    this.stopSources = new NotificationSourcesObserver(input, (fact) =>
      this.publish(fact),
    ).start();
  }

  public report(connection: RpcConnection, sessionId: string | null): boolean {
    if (!this.destinations.has(connection.id)) return false;
    this.attention.report(connection.id, sessionId);

    if (sessionId) this.suppress(sessionId);

    return true;
  }

  public acknowledge(connection: RpcConnection, id: string): boolean {
    return (
      this.destinations.get(connection.id)?.delivery.acknowledge(id) ?? false
    );
  }

  public async *events(
    connection: RpcConnection,
    deliver: boolean,
    signal: AbortSignal,
  ): AsyncGenerator<NotificationStreamEvent> {
    const destination = this.connect(connection, deliver);
    const combined = AbortSignal.any([signal, connection.signal]);

    try {
      yield this.ready();

      for await (const notification of destination.delivery.events(combined))
        yield { type: 'notification', notification };
    } finally {
      this.disconnect(destination);
    }
  }

  private ready(): Extract<NotificationStreamEvent, { type: 'ready' }> {
    return {
      type: 'ready',
      serverId: this.input.serverId,
      heartbeatMs: Math.max(1, Math.floor(this.options.attentionLeaseMs / 2)),
    };
  }

  public close(): void {
    this.stopSources();

    for (const destination of this.destinations.values())
      this.disconnect(destination);
  }

  private connect(connection: RpcConnection, deliver: boolean): Destination {
    const previous = this.destinations.get(connection.id);

    if (previous) this.disconnect(previous);

    const delivery = new NotificationDelivery(
      this.options,
      this.attention,
      deliver,
    );

    return this.track(connection, delivery);
  }

  private track(
    connection: RpcConnection,
    delivery: NotificationDelivery,
  ): Destination {
    const destination: Destination = {
      connection,
      delivery,
      disconnect: () => this.disconnect(destination),
    };

    this.destinations.set(connection.id, destination);
    connection.signal.addEventListener('abort', destination.disconnect, {
      once: true,
    });

    return destination;
  }

  private disconnect(destination: Destination): void {
    const { connection, delivery } = destination;
    connection.signal.removeEventListener('abort', destination.disconnect);
    delivery.stop();

    if (this.destinations.get(connection.id) !== destination) return;
    this.destinations.delete(connection.id);
    this.attention.forget(connection.id);
  }

  private publish(fact: NotificationFact): void {
    const id = notificationId(fact);

    if (this.recent.has(id)) return;
    this.remember(id);

    if (this.attention.includes(fact.sessionId)) return;
    this.deliver({
      ...fact,
      id,
      serverId: this.input.serverId,
      occurredAt: this.options.now(),
    });
  }

  private deliver(notification: NotificationEvent): void {
    for (const destination of this.destinations.values())
      destination.delivery.enqueue(notification);
  }

  private suppress(sessionId: string): void {
    for (const destination of this.destinations.values())
      destination.delivery.suppress(sessionId);
  }

  private remember(id: string): void {
    this.recent.add(id);

    if (this.recent.size <= recentNotificationLimit) return;
    const first = this.recent.values().next().value;

    if (first) this.recent.delete(first);
  }
}
