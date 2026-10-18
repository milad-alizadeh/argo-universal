import { pluginKeychainService, type Keychain } from './keychain';
import type { StateRequest } from './plugin-calls';
import type { PluginValue, SecretCall } from './runtime-protocol';
import type { PluginStorage } from './storage';

// Calls answered from what the Server keeps for the Plugin, with no capability to check.
export type KeptRequest = Extract<
  StateRequest,
  { api: 'storage' | 'secrets' | 'settings' }
>;

const keptApis = new Set<StateRequest['api']>([
  'storage',
  'secrets',
  'settings',
]);

export const isKeptRequest = (request: StateRequest): request is KeptRequest =>
  keptApis.has(request.api);

// What the Server keeps per Plugin: its storage, its Keychain items, and its `contributes.settings` values.
export type Kept = {
  storage: PluginStorage;
  keychain: Keychain;
  settings?: (pluginId: string, key: string) => Promise<PluginValue>;
};

export async function answerKept(
  kept: Kept,
  pluginId: string,
  request: KeptRequest,
): Promise<PluginValue> {
  if (request.api === 'storage')
    return kept.storage.execute(pluginId, request.queries);

  if (request.api === 'settings') return setting(kept, pluginId, request.key);

  return secrets(kept.keychain, pluginId, request.call);
}

async function setting(
  kept: Kept,
  pluginId: string,
  key: string,
): Promise<PluginValue> {
  if (!kept.settings) throw new Error('Plugin settings are not available');

  return kept.settings(pluginId, key);
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
