import { handlerPath } from '@repo/contracts/plugins/action-handler-path';
import type { PluginInteraction } from '@repo/contracts/plugins/wire';
import { checkedEvent, throttle, type PluginEvent } from './plugin-event';
import type { PluginOnEvent } from './plugin-event';

type Queued = {
  key: string;
  interaction: PluginInteraction;
  deliver: PluginOnEvent;
  timer?: ReturnType<typeof setTimeout>;
  replies: PromiseWithResolvers<void>[];
};

export class PluginDispatcher {
  private readonly queued = new Map<string, Queued>();
  private readonly inFlight = new Set<Promise<void>>();
  constructor(private deliver: PluginOnEvent) {}

  public setDelivery(deliver: PluginOnEvent): void {
    this.deliver = deliver;
  }

  public dispatch(
    key: string,
    interaction: PluginInteraction,
  ): void | Promise<void> {
    const delivery = this.deliver(key, interaction);

    if (delivery) this.track(delivery);

    return delivery;
  }

  public send(key: string, event: PluginEvent): void | Promise<void> {
    const interaction = checkedEvent(event);
    const delay = throttle(event.schema);

    if (event.event === 'onSubmit')
      return this.flushPending().then(() => this.dispatch(key, interaction));

    if (!delay) return this.dispatch(key, interaction);
    const pending = this.pending(key, interaction, delay);
    pending.interaction = interaction;
    pending.deliver = this.deliver;
    const reply = Promise.withResolvers<void>();
    pending.replies.push(reply);

    return reply.promise;
  }

  private pending(
    key: string,
    interaction: PluginInteraction,
    delay: number,
  ): Queued {
    const id = JSON.stringify([key, ...handlerPath(interaction)]);
    const queued = { key, interaction, deliver: this.deliver, replies: [] };

    return this.queued.get(id) ?? this.enqueue(id, queued, delay);
  }

  private enqueue(id: string, pending: Queued, delay: number): Queued {
    pending.timer = setTimeout(() => this.flush(id), delay);
    this.queued.set(id, pending);

    return pending;
  }

  private flush(id: string): void {
    const pending = this.queued.get(id);

    if (!pending) return;
    clearTimeout(pending.timer);
    this.queued.delete(id);
    this.track(deliverQueued(pending));
  }

  private track(delivery: Promise<void>): void {
    this.inFlight.add(delivery);

    const settled = (): void => {
      this.inFlight.delete(delivery);
    };

    void delivery.then(settled, settled);
  }

  public async flushPending(): Promise<void> {
    for (const id of this.queued.keys()) this.flush(id);
    await Promise.all(this.inFlight);
  }

  public close(): void {
    for (const pending of this.queued.values()) {
      clearTimeout(pending.timer);

      for (const reply of pending.replies) reply.resolve();
    }

    this.queued.clear();
  }
}

async function deliverQueued(pending: Queued): Promise<void> {
  try {
    await pending.deliver(pending.key, pending.interaction);

    resolveQueued(pending);
  } catch (error) {
    rejectQueued(
      pending,
      error instanceof Error ? error : new Error(String(error)),
    );
    throw error;
  }
}

function rejectQueued(pending: Queued, error: Error): void {
  for (const reply of pending.replies.toReversed()) reply.reject(error);
}

function resolveQueued(pending: Queued): void {
  for (const reply of pending.replies) reply.resolve();
}
