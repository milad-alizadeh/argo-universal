import { expect, it } from 'vitest';
import { borrow } from '#mocks/account-journey';
import { MemorySecretStore } from '#mocks/memory-secret-store';
import { PluginTestClock } from '../worker/test-clock';

const journeyMs = 30_000;

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
  'returns nothing when the provider cannot supply a token before its deadline',
  async () => {
    const secretStore = new SlowSecretStore();
    const clock = new PluginTestClock(0);

    const pending = borrow(
      "argo.fetch('https://api.github.com/done', { account: 'api.github.com' })",
      undefined,
      { secretStore, clock },
    );

    await secretStore.requested.promise;
    await clock.advance(3000);
    const run = await pending;
    expect(run.result).toEqual({ result: { value: null } });
    expect(run.received).toEqual([]);
  },
  journeyMs,
);
