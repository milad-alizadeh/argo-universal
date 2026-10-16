import { pluginKeychainService, type Keychain } from './keychain';
import type {
  PluginReply,
  PluginRequest,
  PluginValue,
  SecretCall,
} from './runtime-protocol';
import type { PluginStorage } from './storage';

// Pages are the runtime's own; every other call is answered here.
export type StateRequest = Exclude<PluginRequest, { api: 'view' }>;

// What a Plugin's `argo` calls reach on the Server. Core keeps nothing: storage and the Keychain belong to the Plugin.
export class PluginServices {
  private readonly storage: PluginStorage;
  private readonly keychain: Keychain;

  constructor(storage: PluginStorage, keychain: Keychain) {
    this.storage = storage;
    this.keychain = keychain;
  }

  async handle(pluginId: string, request: StateRequest): Promise<PluginReply> {
    try {
      return { ok: true, value: await this.perform(pluginId, request) };
    } catch (error) {
      return {
        ok: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  close(): void {
    this.storage.close();
  }

  private async perform(
    pluginId: string,
    request: StateRequest,
  ): Promise<PluginValue> {
    if (request.api === 'storage')
      return this.storage.execute(pluginId, request.queries);

    return this.secrets(pluginId, request.call);
  }

  private async secrets(
    pluginId: string,
    call: SecretCall,
  ): Promise<PluginValue> {
    const service = pluginKeychainService(pluginId);

    if (call.action === 'get') return this.keychain.get(service, call.account);

    await (call.action === 'set'
      ? this.keychain.set(service, call.account, call.value)
      : this.keychain.delete(service, call.account));

    return null;
  }
}
