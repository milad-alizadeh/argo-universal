import type {
  PluginProjectInfo,
  PluginSettingValue,
} from '@repo/contracts/plugins';
import type { PluginAssetRef } from '@repo/contracts/plugins/assets';
import type { Kit } from '../kit/plugin-kit';
import type {
  PluginFetchReply,
  PluginFileEntry,
  PluginFileInfo,
  ProcessResult,
} from '../protocol/argo-answers';
import type { StorageResult } from '../protocol/runtime';
import type { ArgoCall } from './create-plugin-api';
import type { HookRegistrar } from './hook-types';
import type {
  Argo,
  ArgoRequest,
  PluginFetchResponse,
  PluginProcess,
} from './plugin-api';

// Builds the frozen `argo` object; each method is one request, shaped by `PluginRequest`.
export function argoObject(call: ArgoCall, kit: Kit, on: HookRegistrar): Argo {
  return Object.freeze({
    assets: assetCalls(call),
    fs: fileCalls(call),
    process: processCalls(call),
    fetch: async (url, options = {}) =>
      response(await call({ api: 'fetch', call: { url, ...options } })),
    ...stateCalls(call),
    pages: Object.freeze({ register: kit.registerPage }),
    slots: Object.freeze({ register: kit.registerSlot }),
    on,
  });
}

type StateCalls = Pick<Argo, 'storage' | 'projects' | 'secrets' | 'settings'>;

function stateCalls(call: ArgoCall): StateCalls {
  return {
    storage: storageCalls(call),
    projects: Object.freeze({
      list: () =>
        call<PluginProjectInfo[]>({ api: 'projects', action: 'list' }),
    }),
    secrets: secretCalls(call),
    settings: Object.freeze({
      get: async (key) =>
        (await call<PluginSettingValue | null>({ api: 'settings', key })) ??
        null,
    }),
  };
}

const assetCalls = (call: ArgoCall): Argo['assets'] =>
  Object.freeze({
    resolve: (source) => call<PluginAssetRef>({ api: 'assets', source }),
  });

// The Server answers a batch with one result per query.
const storageCalls = (call: ArgoCall): Argo['storage'] =>
  Object.freeze({
    batch: (queries) => call<StorageResult[]>({ api: 'storage', queries }),
    execute: async (query) =>
      (await call<[StorageResult]>({ api: 'storage', queries: [query] }))[0],
  });

function fileCalls(call: ArgoCall): Argo['fs'] {
  const fs = <Answer>(request: ArgoRequest<'fs'>['call']): Promise<Answer> =>
    call({ api: 'fs', call: request });

  return Object.freeze({
    read: (path) => fs<string>({ action: 'read', path }),
    write: async (path, content) => {
      await fs({ action: 'write', path, content });
    },
    list: (path) => fs<PluginFileEntry[]>({ action: 'list', path }),
    stat: (path) => fs<PluginFileInfo>({ action: 'stat', path }),
  });
}

function processCalls(call: ArgoCall): Argo['process'] {
  const run = <Answer>(
    request: ArgoRequest<'process'>['call'],
  ): Promise<Answer> => call({ api: 'process', call: request });

  return Object.freeze({
    run: (argv, options = {}) =>
      run<ProcessResult>({ action: 'run', argv, ...options }),
    spawn: async (argv, options = {}) =>
      spawned(run, await run<string>({ action: 'spawn', argv, ...options })),
  });
}

type ProcessCall = <Answer>(
  request: ArgoRequest<'process'>['call'],
) => Promise<Answer>;

// A spawned command is named by the id the Server gave it.
const spawned = (run: ProcessCall, id: string): PluginProcess =>
  Object.freeze({
    wait: () => run<ProcessResult>({ action: 'wait', id }),
    kill: async () => {
      await run({ action: 'kill', id });
    },
  });

function secretCalls(call: ArgoCall): Argo['secrets'] {
  const secret = async (
    request: ArgoRequest<'secrets'>['call'],
  ): Promise<string | null> =>
    (await call<string | null>({ api: 'secrets', call: request })) ?? null;

  return Object.freeze({
    get: (account) => secret({ action: 'get', account }),
    set: async (account, value) => {
      await secret({ action: 'set', account, value });
    },
    delete: async (account) => {
      await secret({ action: 'delete', account });
    },
  });
}

const response = (reply: PluginFetchReply): PluginFetchResponse =>
  Object.freeze({
    ...reply,
    headers: Object.freeze({ ...reply.headers }),
    text: async () => reply.body,
    json: async () => JSON.parse(reply.body),
  });
