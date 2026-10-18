import type { RuntimePlugin } from './runtime-plugin';

// While any Turn can be writing Plugin sources, workers keep their last complete build.
export class PluginTurns {
  private readonly active = new Set<string>();

  constructor(private readonly plugins: () => Iterable<RuntimePlugin>) {}

  get running(): boolean {
    return this.active.size > 0;
  }

  started(turnId: string): void {
    this.active.add(turnId);
  }

  async ended(turnId: string): Promise<void> {
    this.active.delete(turnId);

    if (this.running) return;
    await Promise.all(
      [...this.plugins()].map((plugin) => plugin.flushReload()),
    );
  }
}
