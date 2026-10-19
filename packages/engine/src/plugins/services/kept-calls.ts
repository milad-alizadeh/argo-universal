import type { PluginValue, SecretCall } from '../protocol/runtime';
import { pluginKeychainService, type Keychain } from './keychain';
import type { KeptRequest, StateRequest } from './plugin-calls';
import type { PluginServiceOptions } from './plugin-service-options';
import type { PluginStorage } from './storage';

// Calls answered from Server-owned state that needs no Capability check.
const keptApis = new Set<StateRequest['api']>([
  'storage',
  'projects',
  'secrets',
  'settings',
]);

export const isKeptRequest = (request: StateRequest): request is KeptRequest =>
  keptApis.has(request.api);

export type KeptContext = {
  storage: PluginStorage;
  keychain: Keychain;
  options: Pick<PluginServiceOptions, 'settings' | 'projectInfo'>;
  pluginId: string;
  request: KeptRequest;
  onCall: () => void;
};

export async function answerKept({
  storage,
  keychain,
  options,
  pluginId,
  request,
  onCall,
}: KeptContext): Promise<PluginValue> {
  onCall();

  if (request.api === 'storage')
    return storage.execute(pluginId, request.queries);

  return answerNonStorageKept({ keychain, options, pluginId, request });
}

async function answerNonStorageKept({
  keychain,
  options,
  pluginId,
  request,
}: Omit<KeptContext, 'storage' | 'onCall'> & {
  request: Exclude<KeptRequest, { api: 'storage' }>;
}): Promise<PluginValue> {
  if (request.api === 'projects') return options.projectInfo();

  if (request.api === 'settings')
    return setting(options, pluginId, request.key);

  return secrets(keychain, pluginId, request.call);
}

async function setting(
  options: Pick<PluginServiceOptions, 'settings'>,
  pluginId: string,
  key: string,
): Promise<PluginValue> {
  if (!options.settings) throw new Error('Plugin settings are not available');

  return options.settings(pluginId, key);
}

async function secrets(
  keychain: Keychain,
  pluginId: string,
  call: SecretCall,
): Promise<PluginValue> {
  const service = pluginKeychainService(pluginId);

  if (call.action === 'get') return keychain.get(service, call.account);

  await (call.action === 'set'
    ? keychain.set(service, call.account, call.value)
    : keychain.delete(service, call.account));

  return null;
}
