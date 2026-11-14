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
import type { PluginAccounts } from '@repo/engine/mocks/test-accounts';
import type {
  PluginStorage,
  PluginNetwork,
  SecretStore,
} from '@repo/engine/plugins';
import type { OpenPage } from './open-page';
import type { PageOpening } from './page-server';
import type { TestProjects } from './test-projects';

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
  // Stands in for the browser `argo.oauth.await` opens: it is handed the authorize URL.
  openBrowser?: (url: string) => Promise<void>;
  // The Plugin's Setting values; a secret one is put in the secret store before the Plugin starts.
  settings?: Map<string, PluginSettingValue>;
  // A folder to keep storage and Accounts in, so a second start over the same folder is a Server restart. The caller removes it.
  home?: string;
  // Stands in for the OS secret store; an in-memory one when left out. Share one across starts to keep Account tokens.
  secretStore?: SecretStore;
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
  // The real Account inventory: what is signed in, and which Account each Project chose.
  accounts: Pick<PluginAccounts, 'list' | 'get' | 'choose' | 'signOut'>;
  badges: (signal: AbortSignal) => AsyncGenerator<PluginBadge[]>;
  failures: (signal: AbortSignal) => AsyncGenerator<PluginFailure[]>;
  log: (pluginId?: string) => Promise<string>;
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
      // Asks the user, as a Session's run in a Project other than its own does; a rejection refuses the run.
      confirm?: (card: { title: string; description: string }) => Promise<void>;
    }) => Promise<Json>;
  };
  /*
   * The Plugin's Loader pages, drawn and acted on as the App does (ADR-0050): a paired device's App unless
   * `serverDevice` asks as the App on the Server Device.
   */
  pages: {
    // One draw of an address, answered as the Server answers the App.
    draw: (input: {
      path: string;
      pageState?: PageState;
      projectId?: string;
      sessionId?: string;
      pages?: number;
      pull?: true;
      known?: string;
      platform?: PluginSurface['platform'];
      serverDevice?: boolean;
    }) => Promise<DrawAnswer>;
    // The page as an App shows it: its tree, and presses that act on what the tree's events hold.
    open: (opening: PageOpening) => Promise<OpenPage>;
    run: (input: {
      operation: string;
      args: PluginOperationParams;
      projectId?: string;
      sessionId?: string;
      serverDevice?: boolean;
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
        serverDevice?: boolean;
      },
      signal: AbortSignal,
    ) => AsyncGenerator<LiveAnswer>;
  };
  close: () => Promise<void>;
  emit: (name: HookEventName, event: JsonObject) => Promise<Json>;
  clock: { advance: (ms: number) => Promise<void> };
  // Turns a Plugin off or on as the Plugin settings do: off stops its worker, on starts it when next asked for.
  plugins: {
    setEnabled: (pluginId: string, enabled: boolean) => Promise<void>;
  };
  settings: Map<string, PluginSettingValue>;
  storage: {
    execute: (
      queries: Parameters<PluginStorage['execute']>[1],
      pluginId?: string,
    ) => ReturnType<PluginStorage['execute']>;
  };
  session: { id: string; projectId: string; agent: string };
}
