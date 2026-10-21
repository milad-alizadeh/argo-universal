import { expect, it } from 'vitest';
import { borrow } from '#mocks/account-journey';
import { MemoryKeychain } from '#mocks/memory-keychain';
import { PluginTestClock } from '../plugins/worker/test-clock';

const journeyMs = 30_000;

// The Keychain is a process boundary. Hold its token read while the real provider waits.
class SlowKeychain extends MemoryKeychain {
  readonly requested = Promise.withResolvers<void>();
  override get(service: string, account: string): Promise<string | null> {
    if (account === 'account-id') return super.get(service, account);
    this.requested.resolve();

    return new Promise(() => {});
  }
}

it(
  'returns nothing when the provider cannot supply a token before its deadline',
  async () => {
    const keychain = new SlowKeychain();
    const clock = new PluginTestClock(0);

    const pending = borrow(
      "argo.fetch('https://api.github.com/done', { account: 'api.github.com' })",
      undefined,
      { keychain, clock },
    );

    await keychain.requested.promise;
    await clock.advance(3000);
    const run = await pending;
    expect(run.result).toEqual({ result: { value: null } });
    expect(run.received).toEqual([]);
  },
  journeyMs,
);
