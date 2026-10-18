import { handlerPath } from '@repo/contracts/plugins/action-handler-path';
import type { PluginInteraction } from '@repo/contracts/plugins/wire';
import type { PluginOnEvent } from './plugin-registry';

const inputThrottleMs = 150;

type Queued = {
  key: string;
  interaction: PluginInteraction;
  deliver: PluginOnEvent;
  timer: ReturnType<typeof setTimeout>;
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
  ): void | Promise<void> {
    if (throttled(interaction)) return this.queue(key, interaction);

    const delivery = this.deliver(key, interaction);

    if (delivery) void this.track(delivery);

    return delivery;
  }

  private queue(key: string, interaction: PluginInteraction): void {
    const id = JSON.stringify([key, ...handlerPath(interaction)]);
    const pending = this.queued.get(id);

    if (pending) {
      pending.interaction = interaction;
      pending.deliver = this.deliver;

      return;
    }

    const timer = setTimeout(() => this.flush(id), inputThrottleMs);
    this.queued.set(id, { key, interaction, timer, deliver: this.deliver });
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

    for (const item of pending) void this.track(deliverQueued(item));
    await Promise.all(this.inFlight);
  }

  public close(): void {
    for (const pending of this.queued.values()) clearTimeout(pending.timer);
    this.queued.clear();
  }
}

function throttled(interaction: PluginInteraction): boolean {
  const event = handlerPath(interaction).at(-1);

  return textEvent(event) || numericChange(interaction);
}

function textEvent(event: string | undefined): boolean {
  return event === 'onSearchTextChange' || event === 'onChangeText';
}

function numericChange(interaction: PluginInteraction): boolean {
  if (handlerPath(interaction).at(-1) !== 'onValueChange') return false;

  const value =
    interaction.event === 'onAction'
      ? interaction.payload.value
      : interaction.payload;

  return typeof value === 'number';
}

async function deliverQueued(pending: Omit<Queued, 'timer'>): Promise<void> {
  await pending.deliver(pending.key, pending.interaction);
}
