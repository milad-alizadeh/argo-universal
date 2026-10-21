import { expect, it } from 'vitest';
import { borrow } from '#mocks/account-journey';
import { startEngineTestHost } from '#mocks/engine';
import { MemoryKeychain } from '#mocks/memory-keychain';

type EngineHost = Awaited<ReturnType<typeof startEngineTestHost>>;

class RefreshingKeychain extends MemoryKeychain {
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
    const keychain = new RefreshingKeychain();
    const prepared = Promise.withResolvers<EngineHost>();

    const pending = borrow(
      "argo.fetch('https://api.github.com/done', {account:'api.github.com'})",
      async (host) => prepared.resolve(host),
      { keychain },
    );

    const host = await prepared.promise;
    await keychain.requested.promise;
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
    keychain.refreshed.resolve();
    const run = await pending;
    expect(run.result).toEqual({ result: { value: null } });
    expect(run.received).toEqual([]);
  },
  30_000,
);
