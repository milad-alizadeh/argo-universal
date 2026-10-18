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

  constructor(private deliver: PluginOnEvent) {}

  public setDelivery(deliver: PluginOnEvent): void {
    this.deliver = deliver;
  }

  public send(
    key: string,
    interaction: PluginInteraction,
  ): void | Promise<void> {
    if (
      interaction.event === 'onSearchTextChange' ||
      interaction.event === 'onChangeText'
    )
      return this.queue(key, interaction);

    return this.deliver(key, interaction);
  }

  private queue(key: string, interaction: PluginInteraction): void {
    const id = JSON.stringify([key, interaction.event]);
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
    void Promise.resolve(
      pending.deliver(pending.key, pending.interaction),
    ).catch(() => {});
  }

  public close(): void {
    for (const pending of this.queued.values()) clearTimeout(pending.timer);
    this.queued.clear();
  }
}
