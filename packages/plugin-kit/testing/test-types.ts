import type { OperationRow } from '@repo/contracts/operations';
import type {
  HookEventName,
  PluginProjectInfo,
  PluginSettingValue,
} from '@repo/contracts/plugins';
import type { PluginSessionInfo } from '@repo/contracts/plugins/argo-calls';
import type { JsonObject, Json } from '@repo/contracts/plugins/hook-protocol';
import type { PluginSurface } from '@repo/contracts/plugins/kit';
import type {
  PageState,
  PageRunAnswer,
  StaleMark,
} from '@repo/contracts/plugins/page-address';
import type { DrawAnswer } from '@repo/contracts/plugins/page-draw';
import type { LiveAnswer } from '@repo/contracts/plugins/page-live';
import type {
  PluginOperationCaller,
  PluginOperationParams,
} from '@repo/contracts/plugins/plugin-operations';
import type {
  ReplaceableAnswer,
  ReplaceableInput,
} from '@repo/contracts/plugins/replaceable';
import type {
  PluginBadge,
  PluginFailure,
} from '@repo/contracts/plugins/runtime';
import type { SlotItems, SlotItemsInput } from '@repo/contracts/plugins/wire';
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
  // What `argo.sessions.get` answers, by Session id.
  sessions?: Record<string, PluginSessionInfo>;
}

// The App an items Slot list is asked from; it decides how many items show before "+N".
type SlotItemsOptions = {
  signal: AbortSignal;
  platform?: PluginSurface['platform'];
};

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
  // One list's merged items, sent again each time a Plugin says its items changed.
  slotItems: (
    input: SlotItemsInput,
    options: SlotItemsOptions,
  ) => AsyncGenerator<SlotItems>;
  // One Replaceable Slot asked once, as the App asks it: a Plugin's checked tree, or core.
  render: (
    input: ReplaceableInput,
    platform?: PluginSurface['platform'],
  ) => Promise<ReplaceableAnswer>;
  // The Operations the Plugin declares, and one run of one as an Agent's `argo run` would (ADR-0044).
  operations: {
    list: () => Promise<OperationRow[]>;
    run: (input: {
      name: string;
      params?: JsonObject;
      caller?: PluginOperationCaller;
      pluginId?: string;
    }) => Promise<Json>;
  };
  // The Plugin's Loader pages, drawn and acted on as the App does (ADR-0050).
  pages: {
    draw: (input: {
      path: string;
      pageState?: PageState;
      projectId?: string;
      sessionId?: string;
      pages?: number;
      known?: string;
    }) => Promise<DrawAnswer>;
    run: (input: {
      operation: string;
      args: PluginOperationParams;
      projectId?: string;
    }) => Promise<PageRunAnswer>;
    // The stale marks every connected App is sent, after an Operation run or the Plugin's `argo.changed()`.
    stale: (signal: AbortSignal) => AsyncGenerator<StaleMark>;
    // A live page as the App subscribes to it: its whole tree, then keyed patches, until the signal aborts.
    live: (
      input: {
        path: string;
        pageState?: PageState;
        projectId?: string;
        sessionId?: string;
        known?: string;
      },
      signal: AbortSignal,
    ) => AsyncGenerator<LiveAnswer>;
  };
  close: () => Promise<void>;
  mount: (input: PluginMount) => Promise<PluginTestView>;
  emit: (name: HookEventName, event: JsonObject) => Promise<Json>;
  clock: { advance: (ms: number) => Promise<void> };
  settings: Map<string, PluginSettingValue>;
  storage: {
    execute: (
      queries: Parameters<PluginStorage['execute']>[1],
      pluginId?: string,
    ) => ReturnType<PluginStorage['execute']>;
  };
  session: { id: string; projectId: string; agent: string };
}
