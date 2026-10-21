import { realClock } from '../clock';
import type { SpawnCaller } from '../hooks/spawn-hooks';
import type { PluginValue } from '../protocol/runtime';
import type { CallReach } from '../services/plugin-calls';
import type { PluginServiceOptions } from '../services/plugin-services';
import {
  borrowFetch,
  type BorrowCall,
  type BorrowRequest,
} from './account-borrow';
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

  reach(): Pick<CallReach, 'accounts' | 'oauth'> {
    return { accounts: this, oauth: this.oauth };
  }

  borrow(call: BorrowCall, request: BorrowRequest): Promise<PluginValue> {
    return borrowFetch(
      { accounts: this.options.accounts, providers: this.providers },
      call,
      request,
    );
  }

  register(
    caller: SpawnCaller,
    options: Parameters<AccountProviders['register']>[1],
  ): void {
    this.registry().register(caller, options);
  }

  settle(
    caller: SpawnCaller,
    reply: Parameters<AccountProviders['settle']>[1],
  ): void {
    this.registry().settle(caller, reply);
  }

  private registry(): AccountProviders {
    if (!this.providers) throw new Error('Account providers are unavailable');

    return this.providers;
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
