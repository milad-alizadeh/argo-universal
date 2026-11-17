import type { PluginList } from '@repo/contracts/plugins';
import { discoverPlugins, type PluginsDeps } from './discovery/loader';

export type Discovered = {
  result: PluginList;
  locations: Map<string, string>;
};

type Discover = (
  deps: PluginsDeps,
  locations: Map<string, string>,
) => Promise<PluginList>;

/*
 * What discovery found, kept until something changes it: a Plugin turned on or off, a dev build landing
 * (which also covers `plugin.json`), or a Plugin the cache has not seen. Concurrent readers share one run.
 */
export class LocatedCache {
  private pending?: Promise<Discovered>;

  constructor(private readonly discover: Discover = discoverPlugins) {}

  read(deps: PluginsDeps): Promise<Discovered> {
    this.pending ??= this.run(deps);

    return this.pending;
  }

  clear(): void {
    this.pending = undefined;
  }

  private async run(deps: PluginsDeps): Promise<Discovered> {
    const locations = new Map<string, string>();

    try {
      return { result: await this.discover(deps, locations), locations };
    } catch (error) {
      this.clear();
      throw error;
    }
  }
}
