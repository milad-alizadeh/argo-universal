import type { AccountInvocation } from '@repo/contracts/plugins/account-calls';
import type { PluginAccount } from '@repo/contracts/plugins/accounts';
import type { PluginClock } from '../clock';
import type { SpawnCaller } from '../hooks/spawn-hooks';
import { providerDeadline } from './provider-deadline';

type Provider = SpawnCaller & { host: string; header: string; prefix: string };

type Credential = { header: string; value: string };

type TokenWait = { promise: Promise<string | null>; release: () => void };

type Waiting = { provider: Provider; settle: (token: string | null) => void };

export type AccountTransport = {
  wake: (pluginId: string) => Promise<void>;
  send: (
    pluginId: string,
    generation: number,
    invocation: AccountInvocation,
  ) => void;
};

export class AccountProviders {
  private readonly providers = new Map<string, Provider>();
  private readonly pending = new Map<number, Waiting>();
  private next = 0;

  constructor(
    private readonly clock: PluginClock,
    private readonly transport: AccountTransport,
  ) {}

  register(
    { pluginId, generation }: SpawnCaller,
    options: Omit<Provider, keyof SpawnCaller>,
  ): void {
    this.providers.set(providerKey(pluginId, options.host), {
      ...options,
      pluginId,
      generation,
    });
  }

  token(account: PluginAccount): Promise<Credential | null> {
    return providerDeadline(this.clock, (signal) =>
      this.request(account, signal),
    );
  }

  private async request(
    account: PluginAccount,
    signal: AbortSignal,
  ): Promise<Credential | null> {
    await this.transport.wake(account.providedBy);

    if (signal.aborted) return null;

    const provider = this.providers.get(
      providerKey(account.providedBy, account.host),
    );

    if (!provider) return null;
    const token = await this.wait(provider, account, signal);

    return credentialValue(provider, token);
  }

  private async wait(
    provider: Provider,
    account: PluginAccount,
    signal: AbortSignal,
  ): Promise<string | null> {
    const id = this.next++;
    const pending = this.begin(provider, id, signal);
    this.send(provider, id, account);

    try {
      return await pending.promise;
    } finally {
      pending.release();
      this.pending.delete(id);
    }
  }

  private send(provider: Provider, id: number, account: PluginAccount): void {
    this.transport.send(provider.pluginId, provider.generation, {
      type: 'accountToken',
      id,
      account,
    });
  }

  private begin(
    provider: Provider,
    id: number,
    signal: AbortSignal,
  ): TokenWait {
    const { promise, resolve } = Promise.withResolvers<string | null>();
    const cancel = (): void => resolve(null);
    this.pending.set(id, { provider, settle: resolve });
    signal.addEventListener('abort', cancel, { once: true });

    return {
      promise,
      release: () => signal.removeEventListener('abort', cancel),
    };
  }

  settle(
    caller: SpawnCaller,
    reply: { id: number; token: string | null },
  ): void {
    const pending = this.pending.get(reply.id);

    if (!pending) return;

    if (!sameWorker(pending.provider, caller)) return;
    this.pending.delete(reply.id);
    pending.settle(reply.token);
  }

  release(pluginId: string): void {
    for (const [key, provider] of this.providers)
      if (provider.pluginId === pluginId) this.providers.delete(key);
    this.releaseCalls(pluginId);
  }

  private releaseCalls(pluginId: string): void {
    for (const [id, pending] of this.pending)
      if (pending.provider.pluginId === pluginId) {
        this.pending.delete(id);
        pending.settle(null);
      }
  }

  close(): void {
    for (const pending of this.pending.values()) pending.settle(null);
    this.pending.clear();
    this.providers.clear();
  }
}

const providerKey = (pluginId: string, host: string): string =>
  JSON.stringify([pluginId, host]);

const sameWorker = (left: SpawnCaller, right: SpawnCaller): boolean =>
  left.pluginId === right.pluginId && left.generation === right.generation;

const credential = (provider: Provider, token: string): Credential => ({
  header: provider.header,
  value: provider.prefix ? `${provider.prefix} ${token}` : token,
});

const credentialValue = (
  provider: Provider,
  token: string | null,
): Credential | null => (token === null ? null : credential(provider, token));
