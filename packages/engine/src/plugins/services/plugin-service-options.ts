import type { CoreHooks, PluginProjectInfo } from '@repo/contracts/plugins';
import type { PluginAssets } from '../assets/plugin-assets';
import type { Waiting } from '../hooks/spawn-hooks';
import type { PluginValue } from '../protocol/runtime-protocol';
import type { PluginNetwork } from './plugin-fetch';

export type PluginServiceOptions = {
  assets: PluginAssets;
  environment?: NodeJS.ProcessEnv;
  log: (line: string) => void;
  projects: () => Promise<readonly string[]>;
  projectInfo: () => Promise<PluginProjectInfo[]>;
  network?: PluginNetwork;
  settings?: (pluginId: string, key: string) => Promise<PluginValue>;
  hooks?: CoreHooks;
  waiting?: Waiting;
};
