import { CapabilityRefusal } from '../access/capability-refusal';
import type { ActivatedPlugin, PluginAccess } from '../access/plugin-access';
import type { AccountServices } from '../accounts/account-services';
import type { PluginOAuth } from '../accounts/plugin-oauth';
import { accountCall, oauthCall } from '../accounts/service-calls';
import {
  runtimeError,
  type PluginRequest,
  type PluginValue,
  type SecretCall,
} from '../protocol/runtime';
import type { RuntimeApiName } from '../protocol/runtime-apis';
import {
  answerAsset,
  answerFetch,
  answerFs,
  answerProcess,
} from './checked-calls';
import { pluginKeychainService, type Keychain } from './keychain';
import type { PluginNetwork } from './plugin-fetch';
import type { PluginResources } from './plugin-resources';
import type { PluginServiceOptions } from './plugin-services';
import { answerSession } from './session-calls';
import type { PluginStorage } from './storage';

// Every call PluginServices answers: what the runtime does not answer itself.
export type StateRequest = Exclude<PluginRequest, { api: RuntimeApiName }>;

type Api = StateRequest['api'];

type RequestOf<Name extends Api> = Extract<StateRequest, { api: Name }>;

// What one call from one worker generation may reach.
export type CallReach = {
  pluginId: string;
  generation: number;
  projectId?: string;
  serverDevice?: boolean;
  accounts: AccountServices;
  oauth: PluginOAuth;
  query?: boolean;
  resources: PluginResources;
  storage: PluginStorage;
  keychain: Keychain;
  options: PluginServiceOptions;
  network: PluginNetwork;
  access: () => PluginAccess;
  activated: () => ActivatedPlugin | undefined;
};

// `logCall` logs the call once it is let through.
export type PluginCall = CallReach & { logCall: () => void };

type CallKind<Name extends Api> = {
  describe: (request: RequestOf<Name>) => string;
  answer: (call: PluginCall, request: RequestOf<Name>) => Promise<PluginValue>;
};

type CallKinds = { [Name in Api]: CallKind<Name> };

// Storage, Projects, secrets and settings are Server-owned state; they are logged and answered with no Capability check.
const kept = <Name extends Api>(
  describe: CallKind<Name>['describe'],
  answer: CallKind<Name>['answer'],
): CallKind<Name> => ({
  describe,
  answer: async (call, request): Promise<PluginValue> => {
    call.logCall();

    return answer(call, request);
  },
});

const calls: CallKinds = {
  accounts: kept(({ call }) => `argo.accounts.${call.action}`, accountCall),
  oauth: kept(() => 'argo.oauth', oauthCall),
  storage: kept(
    ({ queries }) => `argo.storage ${queries.length}`,
    async (call, { queries }) =>
      call.storage.execute(call.pluginId, queries, call.query),
  ),
  projects: kept(
    () => 'argo.projects.list',
    async (call) => call.options.projectInfo(),
  ),
  settings: kept(
    ({ key }) => `argo.settings.get ${key}`,
    (call, { key }) => setting(call, key),
  ),
  secrets: kept(
    ({ call }) => `argo.secrets.${call.action} ${call.account}`,
    (call, request) => secrets(call, request.call),
  ),
  sessions: {
    describe: ({ sessionId }) => `argo.sessions.get ${sessionId}`,
    answer: answerSession,
  },
  assets: {
    describe: () => 'argo.assets.resolve',
    answer: (call, { source }) => answerAsset(call, source),
  },
  fs: {
    describe: ({ call }) => `argo.fs.${call.action} ${call.path}`,
    answer: (call, request) => answerFs(call, request.call),
  },
  process: {
    describe: ({ call }) =>
      `argo.process.${call.action} ${'argv' in call ? call.argv.join(' ') : call.id}`,
    answer: (call, request) => answerProcess(call, request.call),
  },
  fetch: {
    describe: ({ call: { method = 'GET', url } }) =>
      `argo.fetch ${method} ${url}`,
    answer: (call, request) => answerFetch(call, request.call),
  },
};

export const answerCall = <Name extends Api>(
  reach: CallReach,
  request: RequestOf<Name> & { api: Name },
): Promise<PluginValue> =>
  calls[request.api].answer(
    {
      ...reach,
      logCall: () =>
        reach.options.log(
          `Plugin ${reach.pluginId}: ${describeCall<Name>(request)}`,
        ),
    },
    request,
  );

// The log names the call and where it points, never a secret value or a file's content.
const describeCall = <Name extends Api>(
  request: RequestOf<Name> & { api: Name },
): string => calls[request.api].describe(request);

// A refusal is one line naming the Plugin and the call; any other failure keeps its own line.
export function failureLine(
  pluginId: string,
  request: StateRequest,
  cause: unknown,
): string {
  if (cause instanceof CapabilityRefusal)
    return `Plugin ${pluginId}: refused ${describeCall(request)}: ${cause.message}`;

  return `Plugin ${pluginId}: argo call failed: ${runtimeError(cause)}`;
}

async function setting(
  { options, pluginId }: PluginCall,
  key: string,
): Promise<PluginValue> {
  if (!options.settings) throw new Error('Plugin settings are not available');

  return options.settings(pluginId, key);
}

async function secrets(
  { keychain, pluginId }: PluginCall,
  call: SecretCall,
): Promise<PluginValue> {
  const service = pluginKeychainService(pluginId);

  if (call.action === 'get') return keychain.get(service, call.account);

  await (call.action === 'set'
    ? keychain.set(service, call.account, call.value)
    : keychain.delete(service, call.account));

  return null;
}
