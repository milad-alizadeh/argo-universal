import type { PluginSettingValue } from '@repo/contracts/plugins';
import type { Argo, PluginProcess } from '@repo/contracts/plugins/argo-api';
import type {
  FsCall,
  ProcessCall,
  ProcessResult,
  SecretCall,
  StorageResult,
} from '@repo/contracts/plugins/argo-calls';
import { fetchResponse } from '../kit/fetch-response';
import { createKit, type Kit } from '../kit/plugin-kit';
import { configureViewScope } from '../kit/view-scope';
import type { PluginRequest } from '../protocol/runtime';
import { accountDispatcher } from './accounts';
import type { ArgoBridge } from './argo';
import { hookDispatcher } from './hooks';

/*
 * The Plugin API, bundled with the kit (`bundleKit`) and run inside each Plugin's realm before any
 * Plugin code: it takes the bridge, builds the frozen `argo` object Plugin code finds on its global
 * object, and leaves the worker its inboxes and the modules `@argo/plugin-kit` serves.
 */
declare global {
  var __argoBridge: ArgoBridge | undefined;
}

type PluginInbox = (json: string) => void;

export type PluginRealmExports = {
  validateBackground: (path: string, contribution?: string) => void;
  inboxes: { pages: PluginInbox; hooks: PluginInbox; accounts: PluginInbox };
  modules: Pick<Kit, 'exports' | 'jsxRuntime'>;
};

const bridge = globalThis.__argoBridge;

delete globalThis.__argoBridge;

if (!bridge) throw new Error('The kit runs only in a Plugin realm');

if (bridge.inView) configureViewScope(bridge.inView);

// No object, promise or error from the worker's realm reaches Plugin code: only the bridge's JSON text crosses.
const call = async <Value>(request: PluginRequest): Promise<Value> => {
  try {
    return JSON.parse(await bridge(JSON.stringify(request)));
  } catch (error) {
    throw new Error(String(error ? Object(error).message : error));
  }
};

const kit = createKit(
  async (viewId, message) => {
    await call({ api: 'view', viewId, message });
  },
  async (requestId, result) => {
    await call({ api: 'dispatchResult', requestId, result });
  },
  {
    data: (request) => call(request),
    slots: (slotCall) => call({ api: 'slots', call: slotCall }),
    operations: (operationCall) =>
      call({ api: 'operations', call: operationCall }),
  },
);

const hooks = hookDispatcher(
  (hookCall) => call({ api: 'hooks', call: hookCall }),
  kit,
);

const accounts = accountDispatcher(call);

// Each level of `argo` is frozen, so Plugin code can't change what another module sees.
const frozen = <Value>(value: Value): Value => Object.freeze(value);

const secret = async (request: SecretCall): Promise<string | null> =>
  (await call<string | null>({ api: 'secrets', call: request })) ?? null;

const fs = <Value>(request: FsCall): Promise<Value> =>
  call({ api: 'fs', call: request });

const run = <Value>(request: ProcessCall): Promise<Value> =>
  call({ api: 'process', call: request });

const spawned = (id: string): PluginProcess =>
  frozen({
    wait: () => run<ProcessResult>({ action: 'wait', id }),
    kill: async () => {
      await run({ action: 'kill', id });
    },
  });

const argo: Argo = frozen({
  operations: frozen({ register: kit.operations.register }),
  accounts: frozen({
    add: (host, options) =>
      call({ api: 'accounts', call: { action: 'add', host, ...options } }),
    get: (host) => call({ api: 'accounts', call: { action: 'get', host } }),
    provide: accounts.provide,
  }),
  oauth: frozen({
    start: () => call({ api: 'oauth', call: { action: 'start' } }),
    await: (state, url) =>
      call({ api: 'oauth', call: { action: 'await', state, url } }),
  }),
  nav: frozen({
    badge: async (id, count) => {
      await call({ api: 'nav', id, count });
    },
  }),
  assets: frozen({
    resolve: (source) => call({ api: 'assets', source }),
  }),
  fs: frozen({
    read: (path) => fs({ action: 'read', path }),
    write: async (path, content) => {
      await fs({ action: 'write', path, content });
    },
    list: (path) => fs({ action: 'list', path }),
    stat: (path) => fs({ action: 'stat', path }),
  }),
  process: frozen({
    run: (argv, options = {}) => run({ action: 'run', argv, ...options }),
    spawn: async (argv, options = {}) =>
      spawned(await run<string>({ action: 'spawn', argv, ...options })),
  }),
  fetch: async (url, options = {}) => {
    const result = await call<Parameters<typeof fetchResponse>[0] | null>({
      api: 'fetch',
      call: { url, ...options },
    });

    return result === null ? null : fetchResponse(result);
  },
  storage: frozen({
    batch: (queries) => call({ api: 'storage', queries }),
    execute: async (query) =>
      (await call<[StorageResult]>({ api: 'storage', queries: [query] }))[0],
  }),
  projects: frozen({
    list: () => call({ api: 'projects', action: 'list' }),
  }),
  sessions: frozen({
    get: (sessionId) => call({ api: 'sessions', action: 'get', sessionId }),
  }),
  secrets: frozen({
    get: (account) => secret({ action: 'get', account }),
    set: async (account, value) => {
      await secret({ action: 'set', account, value });
    },
    delete: async (account) => {
      await secret({ action: 'delete', account });
    },
  }),
  settings: frozen({
    get: async (key) =>
      (await call<PluginSettingValue | null>({ api: 'settings', key })) ?? null,
  }),
  pages: frozen({ register: kit.registerPage }),
  slots: frozen({ register: kit.slots.register, changed: kit.slots.changed }),
  on: hooks.on,
});

Object.assign(globalThis, {
  argo,
  __argoRealm: {
    validateBackground: kit.requirePage,
    inboxes: { pages: kit.inbox, hooks: hooks.inbox, accounts: accounts.inbox },
    modules: { exports: kit.exports, jsxRuntime: kit.jsxRuntime },
  } satisfies PluginRealmExports,
});
