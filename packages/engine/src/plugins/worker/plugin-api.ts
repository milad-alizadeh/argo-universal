import type {
  PluginProjectInfo,
  PluginSettingValue,
} from '@repo/contracts/plugins';
import type { PluginAssetRef } from '@repo/contracts/plugins/assets';
import type { SlotId } from '@repo/contracts/plugins/wire';
import type { Page, SlotContent } from '../kit/view-content';
import type {
  PluginFetchReply,
  PluginFileEntry,
  PluginFileInfo,
  ProcessResult,
} from '../protocol/argo-answers';
import type {
  PluginRequest,
  StorageQuery,
  StorageResult,
} from '../protocol/runtime';
import type { HookRegistrar } from './hook-types';

export type {
  PluginFileEntry,
  PluginFileInfo,
  PluginFileKind,
  ProcessResult,
} from '../protocol/argo-answers';

export type {
  Hook,
  HookContext,
  HookNext,
  HookOptions,
  HookRegistrar,
} from './hook-types';

export type ArgoRequest<Api extends PluginRequest['api']> = Extract<
  PluginRequest,
  { api: Api }
>;

type Fs<Action> = Extract<ArgoRequest<'fs'>['call'], { action: Action }>;

type Secret<Action> = Extract<
  ArgoRequest<'secrets'>['call'],
  { action: Action }
>;

type Command = Extract<ArgoRequest<'process'>['call'], { action: 'run' }>;

export type CommandOptions = Omit<Command, 'action' | 'argv'>;

type FetchCall = ArgoRequest<'fetch'>['call'];

export type FetchOptions = Omit<FetchCall, 'url'>;

export type PluginProcess = Readonly<{
  wait: () => Promise<ProcessResult>;
  kill: () => Promise<void>;
}>;

// `json()` parses the body as the Plugin's own data.
export type PluginFetchResponse = Readonly<
  Omit<PluginFetchReply, 'headers'> & {
    headers: Readonly<Record<string, string>>;
    text: () => Promise<string>;
    json: <Data = unknown>() => Promise<Data>;
  }
>;

/*
 * The Plugin API: the frozen `argo` object a Plugin's `register(argo)` receives, its only way out of
 * its worker (ADR-0027). Each method sends one `PluginRequest`, so that schema types its arguments.
 */
export type Argo = Readonly<{
  assets: Readonly<{
    resolve: (
      source: ArgoRequest<'assets'>['source'],
    ) => Promise<PluginAssetRef>;
  }>;
  fs: Readonly<{
    read: (path: Fs<'read'>['path']) => Promise<string>;
    write: (
      path: Fs<'write'>['path'],
      content: Fs<'write'>['content'],
    ) => Promise<void>;
    list: (path: Fs<'list'>['path']) => Promise<PluginFileEntry[]>;
    stat: (path: Fs<'stat'>['path']) => Promise<PluginFileInfo>;
  }>;
  process: Readonly<{
    run: (
      argv: Command['argv'],
      options?: CommandOptions,
    ) => Promise<ProcessResult>;
    spawn: (
      argv: Command['argv'],
      options?: CommandOptions,
    ) => Promise<PluginProcess>;
  }>;
  fetch: (
    url: FetchCall['url'],
    options?: FetchOptions,
  ) => Promise<PluginFetchResponse>;
  storage: Readonly<{
    batch: (queries: StorageQuery[]) => Promise<StorageResult[]>;
    execute: (query: StorageQuery) => Promise<StorageResult>;
  }>;
  projects: Readonly<{ list: () => Promise<PluginProjectInfo[]> }>;
  secrets: Readonly<{
    get: (account: Secret<'get'>['account']) => Promise<string | null>;
    set: (
      account: Secret<'set'>['account'],
      value: Secret<'set'>['value'],
    ) => Promise<void>;
    delete: (account: Secret<'delete'>['account']) => Promise<void>;
  }>;
  settings: Readonly<{
    get: (
      key: ArgoRequest<'settings'>['key'],
    ) => Promise<PluginSettingValue | null>;
  }>;
  pages: Readonly<{ register: (path: string, page: Page) => void }>;
  slots: Readonly<{
    register: (slotId: SlotId, content: SlotContent) => void;
  }>;
  on: HookRegistrar;
}>;
