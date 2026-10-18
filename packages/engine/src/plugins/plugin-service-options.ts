import type { CoreHooks } from '@repo/contracts/plugins';
import type { PluginAssets } from './assets';
import type { Waiting } from './hooks/spawn-hooks';
import type { PluginNetwork } from './plugin-fetch';
import type { PluginValue } from './runtime-protocol';

export type PluginServiceOptions = {
  assets: PluginAssets;
  log: (line: string) => void;
  projects: () => Promise<readonly string[]>;
  network?: PluginNetwork;
  settings?: (pluginId: string, key: string) => Promise<PluginValue>;
  hooks?: CoreHooks;
  waiting?: Waiting;
};
