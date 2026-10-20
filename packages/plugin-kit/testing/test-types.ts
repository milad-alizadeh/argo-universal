import type {
  HookEventName,
  PluginProjectInfo,
  PluginSettingValue,
} from '@repo/contracts/plugins';
import type { JsonObject, Json } from '@repo/contracts/plugins/hook-protocol';
import type {
  PluginBadge,
  PluginFailure,
} from '@repo/contracts/plugins/runtime';
import type { PluginSlotInput } from '@repo/contracts/plugins/wire';
import type { PluginStorage, PluginNetwork } from '@repo/engine/plugins';
import type { TestProjects } from './test-projects';
import type { PluginMount, PluginTestView } from './view';

export interface PluginTestOptions {
  directory: string;
  pluginId: string;
  version: string;
  projects?: PluginProjectInfo[];
  projectPaths?: Record<string, string>;
  // Folders containing external executable fixtures, prepended only for this runtime.
  path?: string[];
  clockStart?: number;
  network?: PluginNetwork;
  settings?: Map<string, PluginSettingValue>;
}

export interface PluginTest {
  projects: TestProjects;
  badges: (signal: AbortSignal) => AsyncGenerator<PluginBadge[]>;
  failures: (signal: AbortSignal) => AsyncGenerator<PluginFailure[]>;
  log: (pluginId?: string) => Promise<string>;
  page: (
    path?: string,
    pluginId?: string,
    projectId?: string,
  ) => PluginTestView;
  slot: (slot: PluginSlotInput, pluginId?: string) => PluginTestView;
  close: () => Promise<void>;
  mount: (input: PluginMount) => Promise<PluginTestView>;
  emit: (name: HookEventName, event: JsonObject) => Promise<Json>;
  clock: { advance: (ms: number, pluginId?: string) => Promise<void> };
  settings: Map<string, PluginSettingValue>;
  storage: {
    execute: (
      queries: Parameters<PluginStorage['execute']>[1],
      pluginId?: string,
    ) => ReturnType<PluginStorage['execute']>;
  };
  session: { id: string; projectId: string; agent: string };
}
