import type { RuntimePlugin } from './plugin';

// While any Turn can be writing Plugin sources, workers keep their last complete build.
export class PluginTurns {
  running = false;

  constructor(private readonly plugins: () => Iterable<RuntimePlugin>) {}

  changed(active: boolean): void {
    this.running = active;

    if (active) return;

    for (const plugin of this.plugins()) plugin.flushReload();
  }
}
