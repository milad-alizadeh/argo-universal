import { handlerPath } from '@repo/contracts/plugins/action-handler-path';
import {
  partEventRules,
  type PluginInteraction,
} from '@repo/contracts/plugins/wire';
import { checkedEvent, type PluginEvent } from './plugin-event';
import type { PluginOnEvent } from './plugin-event';

type Queued = {
  key: string;
  interaction: PluginInteraction;
  deliver: PluginOnEvent;
  timer?: ReturnType<typeof setTimeout>;
  reply: PromiseWithResolvers<void>;
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
    const rules = partEventRules(event.schema);

    if (rules.flush)
      return this.flushPending().then(() => this.dispatch(key, interaction));

    if (!rules.throttleMs) return this.dispatch(key, interaction);
    const pending = this.pending(key, interaction, rules.throttleMs);
    pending.interaction = interaction;
    pending.deliver = this.deliver;

    return pending.reply.promise;
  }

  private pending(
    key: string,
    interaction: PluginInteraction,
    delay: number,
  ): Queued {
    const id = JSON.stringify([key, ...handlerPath(interaction)]);
    const reply = Promise.withResolvers<void>();
    const queued = { key, interaction, deliver: this.deliver, reply };

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

      pending.reply.resolve();
    }

    this.queued.clear();
  }
}

async function deliverQueued(pending: Queued): Promise<void> {
  try {
    await pending.deliver(pending.key, pending.interaction);
    pending.reply.resolve();
  } catch (error) {
    pending.reply.reject(error);
    throw error;
  }
}
