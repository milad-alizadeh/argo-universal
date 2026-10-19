import { partEventRules, type PartEvent } from '@repo/contracts/plugins/wire';
import {
  checkedPartEvent,
  type PartEventInput,
  type PluginOnEvent,
} from './plugin-event';

type Queued = {
  key: string;
  event: PartEvent;
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

  public dispatch(key: string, event: PartEvent): void | Promise<void> {
    const delivery = this.deliver(key, event);

    if (delivery) this.track(delivery);

    return delivery;
  }

  public send(key: string, input: PartEventInput): void | Promise<void> {
    const event = checkedPartEvent(input);
    const rules = partEventRules(input.schema);

    if (rules.flush)
      return this.flushPending().then(() => this.dispatch(key, event));

    if (!rules.throttleMs) return this.dispatch(key, event);
    const pending = this.pending(key, event, rules.throttleMs);
    pending.event = event;
    pending.deliver = this.deliver;

    return pending.reply.promise;
  }

  private pending(key: string, event: PartEvent, delay: number): Queued {
    const id = JSON.stringify([key, event.event]);
    const reply = Promise.withResolvers<void>();
    const queued = { key, event, deliver: this.deliver, reply };

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
    await pending.deliver(pending.key, pending.event);
    pending.reply.resolve();
  } catch (error) {
    pending.reply.reject(error);
    throw error;
  }
}
