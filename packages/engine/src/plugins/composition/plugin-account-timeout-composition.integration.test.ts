import { expect, it } from 'vitest';
import { borrow } from '#mocks/account-journey';
import { MemorySecretStore } from '#mocks/memory-secret-store';
import { PluginTestClock } from '../worker/test-clock';

const journeyMs = 30_000;

const fetchAccount =
  "argo.fetch('https://api.github.com/done', { account: 'api.github.com' })";

// The OS secret store is a process boundary. Hold its token read while the real provider waits.
class SlowSecretStore extends MemorySecretStore {
  readonly requested = Promise.withResolvers<void>();
  override get(service: string, account: string): Promise<string | null> {
    if (account === 'account-id') return super.get(service, account);
    this.requested.resolve();

    return new Promise(() => {});
  }
}

it(
  'reports a temporary error when the provider cannot supply a token before its deadline',
  async () => {
    const secretStore = new SlowSecretStore();
    const clock = new PluginTestClock(0);

    const pending = borrow(fetchAccount, undefined, { secretStore, clock });

    await secretStore.requested.promise;
    await clock.advance(3000);
    const run = await pending;
    expect(run.result).toEqual({
      result: { error: 'Account is temporarily unavailable. Try again.' },
    });
    expect(run.received).toEqual([]);
  },
  journeyMs,
);

// A store that can be opened, but refuses one credential read.
class FailedSecretStore extends MemorySecretStore {
  override get(service: string, account: string): Promise<string | null> {
    return account === 'account-id'
      ? super.get(service, account)
      : Promise.reject(new Error('OS store is temporarily locked'));
  }
}

it(
  'reports a temporary error when the provider fails to read its credential',
  async () => {
    const run = await borrow(fetchAccount, undefined, {
      secretStore: new FailedSecretStore(),
    });

    expect(run.result).toEqual({
      result: { error: 'Account is temporarily unavailable. Try again.' },
    });
    expect(run.received).toEqual([]);
  },
  journeyMs,
);

it(
  'returns nothing when the provider confirms that its credential is missing',
  async () => {
    const secretStore = new MemorySecretStore();

    const run = await borrow(
      fetchAccount,
      async ({ caller }) => {
        const [account] = await caller.plugins.accounts.list();

        if (!account) throw new Error('Missing fixture Account');

        await secretStore.delete('argo.plugin.probe', account.id);
      },
      { secretStore },
    );

    expect(run.result).toEqual({ result: { value: null } });
    expect(run.received).toEqual([]);
  },
  journeyMs,
);
