import type {
  FetchReply,
  ProcessResult,
  StorageResult,
} from '@repo/contracts/plugins/argo-calls';
import type { Kit } from '../kit/plugin-kit';
import type { ArgoCall } from './create-plugin-api';
import type { HookRegistrar } from './hook-types';
import type { Argo, ArgoRequest } from './plugin-api';

// What a method resolves to: the Server's answer, inferred from its schema in Contracts.
type Answer<Call> = Call extends (...args: never[]) => Promise<infer Value>
  ? Value
  : never;

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
        call<Answer<Argo['projects']['list']>>({
          api: 'projects',
          action: 'list',
        }),
    }),
    secrets: secretCalls(call),
    settings: settingCalls(call),
  };
}

const settingCalls = (call: ArgoCall): Argo['settings'] =>
  Object.freeze({
    get: async (key) =>
      (await call<Answer<Argo['settings']['get']>>({ api: 'settings', key })) ??
      null,
  });

const assetCalls = (call: ArgoCall): Argo['assets'] =>
  Object.freeze({
    resolve: (source) =>
      call<Answer<Argo['assets']['resolve']>>({ api: 'assets', source }),
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
    list: (path) => fs<Answer<Argo['fs']['list']>>({ action: 'list', path }),
    stat: (path) => fs<Answer<Argo['fs']['stat']>>({ action: 'stat', path }),
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
const spawned = (
  run: ProcessCall,
  id: string,
): Answer<Argo['process']['spawn']> =>
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

const response = (reply: FetchReply): Answer<Argo['fetch']> =>
  Object.freeze({
    ...reply,
    headers: Object.freeze({ ...reply.headers }),
    text: async () => reply.body,
    json: async () => JSON.parse(reply.body),
  });
