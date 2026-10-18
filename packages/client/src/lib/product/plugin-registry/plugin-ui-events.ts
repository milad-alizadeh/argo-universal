import { handlerPath } from '@repo/contracts/plugins/action-handler-path';
import type { PluginInteraction } from '@repo/contracts/plugins/wire';
import type { PluginOnEvent } from './plugin-registry';

type QueuedInput = {
  key: string;
  interaction: PluginInteraction;
  throttleMs: number;
};

type Queued = {
  key: string;
  interaction: PluginInteraction;
  deliver: PluginOnEvent;
  timer: ReturnType<typeof setTimeout>;
  replies: ReturnType<typeof Promise.withResolvers<void>>[];
};

export class PluginUiEvents {
  private readonly queued = new Map<string, Queued>();
  private readonly inFlight = new Set<Promise<void>>();

  constructor(private deliver: PluginOnEvent) {}

  public setDelivery(deliver: PluginOnEvent): void {
    this.deliver = deliver;
  }

  public send(
    key: string,
    interaction: PluginInteraction,
    throttleMs = 0,
  ): void | Promise<void> {
    if (throttleMs > 0) return this.queue({ key, interaction, throttleMs });

    return this.immediate(key, interaction);
  }

  private immediate(
    key: string,
    interaction: PluginInteraction,
  ): void | Promise<void> {
    const delivery = this.deliver(key, interaction);

    if (delivery) void this.track(delivery);

    return delivery;
  }

  private queue(input: QueuedInput): Promise<void> {
    const id = JSON.stringify([input.key, ...handlerPath(input.interaction)]);
    const reply = Promise.withResolvers<void>();
    const pending = this.queued.get(id);

    if (pending)
      updateQueued(pending, input.interaction, {
        reply,
        deliver: this.deliver,
      });
    else this.startQueue(id, input, reply);

    return reply.promise;
  }

  private startQueue(
    id: string,
    input: QueuedInput,
    reply: PromiseWithResolvers<void>,
  ): void {
    const timer = setTimeout(() => this.flush(id), input.throttleMs);
    this.queued.set(id, {
      key: input.key,
      interaction: input.interaction,
      timer,
      deliver: this.deliver,
      replies: [reply],
    });
  }

  private flush(id: string): void {
    const pending = this.queued.get(id);

    if (!pending) return;
    this.queued.delete(id);
    void this.track(deliverQueued(pending)).catch(() => {});
  }

  private track(delivery: Promise<void>): Promise<void> {
    this.inFlight.add(delivery);

    const settled = (): void => {
      this.inFlight.delete(delivery);
    };

    void delivery.then(settled, settled);

    return delivery;
  }

  public async flushPending(): Promise<void> {
    const pending = [...this.queued.values()];
    this.queued.clear();

    for (const item of pending) clearTimeout(item.timer);

    for (const item of pending)
      void this.track(deliverQueued(item)).catch(() => {});
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

async function deliverQueued(pending: Omit<Queued, 'timer'>): Promise<void> {
  try {
    await pending.deliver(pending.key, pending.interaction);

    resolveReplies(pending.replies);
  } catch (error) {
    rejectReplies(pending.replies, error);
    throw error;
  }
}

function resolveReplies(replies: PromiseWithResolvers<void>[]): void {
  for (const reply of replies) reply.resolve();
}

function updateQueued(
  pending: Queued,
  interaction: PluginInteraction,
  current: { reply: PromiseWithResolvers<void>; deliver: PluginOnEvent },
): void {
  pending.interaction = interaction;
  pending.deliver = current.deliver;
  pending.replies.push(current.reply);
}

function rejectReplies(
  replies: PromiseWithResolvers<void>[],
  reason: Parameters<PromiseWithResolvers<void>['reject']>[0],
): void {
  for (const reply of replies) reply.reject(reason);
}
