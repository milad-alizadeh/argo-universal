import { pluginKeychainService, type Keychain } from './keychain';
import type {
  PluginReply,
  PluginRequest,
  PluginValue,
} from './runtime-protocol';
import type { PluginStorage } from './storage';

type SecretResult = string | null | void;

type SecretsRequest = Extract<PluginRequest, { api: 'secrets' }>;

// What a Plugin's `argo` calls reach on the Server. Core keeps nothing: storage and the Keychain belong to the Plugin.
export class PluginServices {
  private readonly storage: PluginStorage;
  private readonly keychain: Keychain;

  constructor(storage: PluginStorage, keychain: Keychain) {
    this.storage = storage;
    this.keychain = keychain;
  }

  async handle(pluginId: string, request: PluginRequest): Promise<PluginReply> {
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
    request: PluginRequest,
  ): Promise<PluginValue> {
    if (request.api === 'storage')
      return this.storage.execute(pluginId, request.queries);

    return this.secrets(pluginId, request);
  }

  private secrets(
    pluginId: string,
    { action, account, value }: SecretsRequest,
  ): Promise<PluginValue> {
    const service = pluginKeychainService(pluginId);

    const actions: Record<
      SecretsRequest['action'],
      () => Promise<SecretResult>
    > = {
      get: () => this.keychain.get(service, account),
      set: () => this.keychain.set(service, account, value),
      delete: () => this.keychain.delete(service, account),
    };

    return actions[action]().then((result) => result ?? null);
  }
}
