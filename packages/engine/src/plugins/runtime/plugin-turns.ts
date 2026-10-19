import type { RuntimePlugin } from './plugin';

// While any Turn can be writing Plugin sources, workers keep their last complete build.
export class PluginTurns {
  running = false;

  constructor(private readonly plugins: () => Iterable<RuntimePlugin>) {}

  async changed(active: boolean): Promise<void> {
    this.running = active;

    if (active) return;
    await Promise.all(
      [...this.plugins()].map((plugin) => plugin.flushReload()),
    );
  }
}
