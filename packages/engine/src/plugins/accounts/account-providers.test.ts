import type { AccountInvocation } from '@repo/contracts/plugins/account-calls';
import type { PluginAccount } from '@repo/contracts/plugins/accounts';
import { setImmediate } from 'node:timers/promises';
import { expect, it } from 'vitest';
import { PluginTestClock } from '../worker/test-clock';
import { AccountProviders } from './account-providers';

const provider = { pluginId: 'issue-tracker', generation: 1 };

const accountFor = (id: string): PluginAccount => ({
  id,
  host: 'api.github.com',
  label: id,
  providedBy: provider.pluginId,
});

const unavailable = 'Account is temporarily unavailable. Try again.';

// A provider registered by its worker, with each wake and token request it receives recorded.
function providers(options: { registered?: boolean } = {}): {
  clock: PluginTestClock;
  providers: AccountProviders;
  sent: AccountInvocation[];
  woken: string[];
} {
  const clock = new PluginTestClock(0);
  const sent: AccountInvocation[] = [];
  const woken: string[] = [];
  const accounts = new AccountProviders(clock, {
    wake: async (pluginId) => {
      woken.push(pluginId);
    },
    send: (_pluginId, _generation, invocation) => sent.push(invocation),
  });

  if (options.registered ?? true)
    accounts.register(provider, {
      host: 'api.github.com',
      header: 'Authorization',
      prefix: 'Bearer',
    });

  return { clock, providers: accounts, sent, woken };
}

const answer = (
  accounts: AccountProviders,
  { id }: AccountInvocation,
  token: string,
): void => accounts.settle(provider, { id, result: { kind: 'token', token } });

it('asks a registered provider for a token without waking it', async () => {
  const { providers: accounts, sent, woken } = providers();

  const borrowed = accounts.token(accountFor('first'));
  await setImmediate();
  answer(accounts, sent[0]!, 'secret');

  await expect(borrowed).resolves.toEqual({
    header: 'Authorization',
    value: 'Bearer secret',
  });
  expect(woken).toEqual([]);
});

it('wakes a provider that has not registered before asking it', async () => {
  const { providers: accounts, woken } = providers({ registered: false });

  // Nothing registers during the wake, so the borrow ends unavailable.
  const borrowed = expect(accounts.token(accountFor('first'))).rejects.toThrow(
    unavailable,
  );
  await borrowed;

  expect(woken).toEqual(['issue-tracker']);
});

it('sends one token request for concurrent borrows of one Account', async () => {
  const { providers: accounts, sent } = providers();
  const account = accountFor('first');

  const borrows = Array.from({ length: 12 }, () => accounts.token(account));
  await setImmediate();
  expect(sent).toHaveLength(1);
  answer(accounts, sent[0]!, 'secret');

  const credentials = await Promise.all(borrows);
  expect(new Set(credentials.map(({ value }) => value))).toEqual(
    new Set(['Bearer secret']),
  );
});

it('fails every waiting borrow when the shared request runs late, then asks again', async () => {
  const { clock, providers: accounts, sent } = providers();
  const account = accountFor('first');

  const borrows = Array.from({ length: 12 }, () =>
    accounts.token(account).catch((error: Error) => error.message),
  );
  await setImmediate();
  await clock.advance(3000);

  expect(await Promise.all(borrows)).toEqual(Array(12).fill(unavailable));

  const next = accounts.token(account);
  await setImmediate();
  expect(sent).toHaveLength(2);
  answer(accounts, sent[1]!, 'fresh');
  await expect(next).resolves.toMatchObject({ value: 'Bearer fresh' });
});

it('asks once per Account when two Accounts are borrowed at once', async () => {
  const { providers: accounts, sent } = providers();

  void accounts.token(accountFor('first')).catch(() => {});
  void accounts.token(accountFor('first')).catch(() => {});
  void accounts.token(accountFor('second')).catch(() => {});
  await setImmediate();

  expect(
    sent.map(({ account }) => (account as { id: string }).id).sort(),
  ).toEqual(['first', 'second']);
  accounts.close();
});

it('fails every borrow waiting on a shared request when its provider is released', async () => {
  const { providers: accounts, sent } = providers();
  const account = accountFor('first');

  const borrows = Array.from({ length: 3 }, () =>
    accounts.token(account).catch((error: Error) => error.message),
  );
  await setImmediate();
  expect(sent).toHaveLength(1);
  accounts.release(provider.pluginId);

  expect(await Promise.all(borrows)).toEqual(Array(3).fill(unavailable));
});
