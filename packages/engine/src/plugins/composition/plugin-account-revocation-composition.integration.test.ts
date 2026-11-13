import { expect, it } from 'vitest';
import { borrow } from '#mocks/account-journey';
import { startEngineTestHost } from '#mocks/engine';
import { MemorySecretStore } from '#mocks/memory-secret-store';

type EngineHost = Awaited<ReturnType<typeof startEngineTestHost>>;

class RefreshingSecretStore extends MemorySecretStore {
  readonly requested = Promise.withResolvers<void>();
  readonly refreshed = Promise.withResolvers<void>();

  override async get(service: string, account: string): Promise<string | null> {
    const token = await super.get(service, account);

    if (account !== 'account-id') {
      this.requested.resolve();
      await this.refreshed.promise;
    }

    return token;
  }
}

it.each(['revoke', 'signOut'] as const)(
  '%s wins while the provider refreshes its token',
  async (change) => {
    const secretStore = new RefreshingSecretStore();
    const prepared = Promise.withResolvers<EngineHost>();

    const pending = borrow(
      "argo.fetch('https://api.github.com/done', {account:'api.github.com'})",
      async (host) => prepared.resolve(host),
      { secretStore },
    );

    const host = await prepared.promise;
    await secretStore.requested.promise;
    const [account] = await host.caller.plugins.accounts.list();

    if (!account) throw new Error('Missing fixture Account');

    await (change === 'signOut'
      ? host.caller.plugins.accounts.signOut({ id: account.id })
      : host.caller.plugins.accounts.grant({
          host: account.host,
          account: account.id,
          plugin: 'borrower',
          allowed: false,
        }));
    secretStore.refreshed.resolve();
    const run = await pending;
    expect(run.result).toEqual({ result: { value: null } });
    expect(run.received).toEqual([]);
  },
  30_000,
);
