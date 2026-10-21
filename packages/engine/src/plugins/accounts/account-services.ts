import { realClock } from '../clock';
import type { CallReach } from '../services/plugin-calls';
import type { PluginServiceOptions } from '../services/plugin-services';
import { AccountProviders, type AccountTransport } from './account-providers';
import { PluginOAuth } from './plugin-oauth';

// Account calls share each worker's lifetime, while their inventory outlives it.
export class AccountServices {
  private providers?: AccountProviders;
  private readonly oauth;
  constructor(private readonly options: PluginServiceOptions) {
    this.oauth = new PluginOAuth(
      options.log,
      options.clock ?? realClock,
      options.oauth,
    );
  }

  connect(send: AccountTransport['send']): void {
    this.providers = new AccountProviders(this.options.clock ?? realClock, {
      send,
      wake: this.options.wakePlugin ?? alreadyRunning,
    });
  }

  reach(): Pick<CallReach, 'providers' | 'oauth'> {
    return { providers: this.providers, oauth: this.oauth };
  }

  release(pluginId: string): void {
    this.oauth.release(pluginId);
    this.providers?.release(pluginId);
  }

  close(): void {
    this.oauth.close();
    this.providers?.close();
  }
}

const alreadyRunning = async (): Promise<void> => {};
