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
  timer: ReturnType<typeof setTimeout>;
  reply: PromiseWithResolvers<void>;
};

export class PluginDispatcher {
  private readonly queued = new Map<string, Queued>();
  // Throttled edits on their way to the Plugin; they settle, never reject.
  private readonly edits = new Set<Promise<void>>();
  constructor(private deliver: PluginOnEvent) {}

  public setDelivery(deliver: PluginOnEvent): void {
    this.deliver = deliver;
  }

  public send(key: string, input: PartEventInput): void | Promise<void> {
    const event = checkedPartEvent(input);
    const { flush, throttleMs } = partEventRules(input.schema);
    const deliver = this.deliver;

    if (throttleMs) return this.queue({ key, event, deliver }, throttleMs);
    // Queued edits reach the Plugin, in order, before a Submit or press that flushes.
    const edits = flush ? this.releaseAll() : [];

    return after(edits, () => deliver(key, event));
  }

  private queue(
    edit: Omit<Queued, 'timer' | 'reply'>,
    delay: number,
  ): Promise<void> {
    const id = JSON.stringify([edit.key, edit.event.event]);

    const queued = this.queued.get(id) ?? {
      ...edit,
      timer: setTimeout(() => this.release(id), delay),
      reply: Promise.withResolvers<void>(),
    };

    this.queued.set(id, Object.assign(queued, edit));

    return queued.reply.promise;
  }

  private release(id: string): void {
    const queued = this.queued.get(id);

    if (!queued) return;
    clearTimeout(queued.timer);
    this.queued.delete(id);
    const delivery = deliverQueued(queued);
    this.edits.add(delivery);
    void delivery.then(() => this.edits.delete(delivery));
  }

  private releaseAll(): Promise<void>[] {
    for (const id of this.queued.keys()) this.release(id);

    return [...this.edits];
  }

  // Closing sends what the user typed rather than dropping it.
  public close(): void {
    void this.releaseAll();
  }
}

function after(
  edits: Promise<void>[],
  deliver: () => void | Promise<void>,
): void | Promise<void> {
  return edits.length ? Promise.all(edits).then(deliver) : deliver();
}

async function deliverQueued(queued: Queued): Promise<void> {
  try {
    await queued.deliver(queued.key, queued.event);
    queued.reply.resolve();
  } catch (error) {
    queued.reply.reject(error);
  }
}
