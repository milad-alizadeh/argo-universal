import { setImmediate } from 'node:timers/promises';
import type { AccountInvocation } from '@repo/contracts/plugins/account-calls';
import { PluginAccount } from '@repo/contracts/plugins/accounts';
import { expect, it } from 'vitest';
import { PluginTestClock } from '../worker/test-clock';
import type { AccountCredential } from './account-headers';
import { AccountProviders, type AccountTransport } from './account-providers';

const provider = { pluginId: 'issue-tracker', generation: 1 };

const providerOptions = {
  host: 'api.github.com',
  header: 'Authorization',
  prefix: 'Bearer',
};

const unavailable = 'Account is temporarily unavailable. Try again.';

const accountFor = (id: string): PluginAccount => ({
  id,
  host: 'api.github.com',
  label: id,
  providedBy: provider.pluginId,
});

// The provider's transport, recording each wake and each token request it is sent.
class RecordingTransport implements AccountTransport {
  readonly sent: AccountInvocation[] = [];
  readonly woken: string[] = [];

  readonly wake = async (pluginId: string): Promise<void> => {
    this.woken.push(pluginId);
  };

  readonly send: AccountTransport['send'] = (_plugin, _generation, call) => {
    this.sent.push(call);
  };

  request(index: number): AccountInvocation {
    const invocation = this.sent[index];

    if (!invocation) throw new Error(`No token request ${index}`);

    return invocation;
  }
}

// The providers under test, the clock their deadlines run on, and what their transport was sent.
type Setup = {
  clock: PluginTestClock;
  accounts: AccountProviders;
  transport: RecordingTransport;
};

function unregistered(): Setup {
  const clock = new PluginTestClock(0);
  const transport = new RecordingTransport();

  return { clock, accounts: new AccountProviders(clock, transport), transport };
}

function registered(): Setup {
  const setup = unregistered();

  setup.accounts.register(provider, providerOptions);

  return setup;
}

const answer = (
  accounts: AccountProviders,
  { id }: AccountInvocation,
  token: string,
): void => accounts.settle(provider, { id, result: { kind: 'token', token } });

// Each borrow's credential value, or its error message.
const borrowMany = (
  accounts: AccountProviders,
  account: PluginAccount,
  count: number,
): Promise<string[]> =>
  Promise.all(
    Array.from({ length: count }, () =>
      accounts.token(account).then(
        (credential: AccountCredential | null) => credential?.value ?? '',
        (error: Error) => error.message,
      ),
    ),
  );

it('asks a registered provider for a token without waking it', async () => {
  const { accounts, transport } = registered();

  const borrowed = accounts.token(accountFor('first'));

  await setImmediate();
  answer(accounts, transport.request(0), 'secret');

  await expect(borrowed).resolves.toEqual({
    header: 'Authorization',
    value: 'Bearer secret',
  });
  expect(transport.woken).toEqual([]);
});

it('wakes a provider that has not registered before asking it', async () => {
  const { accounts, transport } = unregistered();

  // Nothing registers during the wake, so the borrow ends unavailable.
  await expect(accounts.token(accountFor('first'))).rejects.toThrow(
    unavailable,
  );

  expect(transport.woken).toEqual(['issue-tracker']);
});

it('sends one token request for concurrent borrows of one Account', async () => {
  const { accounts, transport } = registered();

  const borrows = borrowMany(accounts, accountFor('first'), 12);

  await setImmediate();
  expect(transport.sent).toHaveLength(1);
  answer(accounts, transport.request(0), 'secret');

  expect(await borrows).toEqual(Array(12).fill('Bearer secret'));
});

it('fails every waiting borrow when the shared request runs late, then asks again', async () => {
  const { clock, accounts, transport } = registered();
  const account = accountFor('first');

  const borrows = borrowMany(accounts, account, 12);

  await setImmediate();
  await clock.advance(3000);
  expect(await borrows).toEqual(Array(12).fill(unavailable));

  const next = accounts.token(account);

  await setImmediate();
  answer(accounts, transport.request(1), 'fresh');
  await expect(next).resolves.toMatchObject({ value: 'Bearer fresh' });
});

it('asks once per Account when two Accounts are borrowed at once', async () => {
  const { accounts, transport } = registered();

  const first = borrowMany(accounts, accountFor('first'), 2);
  const second = borrowMany(accounts, accountFor('second'), 1);

  await setImmediate();

  const asked = transport.sent.map(
    ({ account }) => PluginAccount.parse(account).id,
  );

  expect(asked.sort()).toEqual(['first', 'second']);
  accounts.close();
  expect([...(await first), ...(await second)]).toEqual(
    Array(3).fill(unavailable),
  );
});

it('fails every borrow waiting on a shared request when its provider is released', async () => {
  const { accounts, transport } = registered();

  const borrows = borrowMany(accounts, accountFor('first'), 3);

  await setImmediate();
  expect(transport.sent).toHaveLength(1);
  accounts.release(provider.pluginId);

  expect(await borrows).toEqual(Array(3).fill(unavailable));
});

it('asks a provider that registers again right after its release, instead of sharing the failed request', async () => {
  const { accounts, transport } = registered();
  const account = accountFor('first');

  const failed = borrowMany(accounts, account, 1);

  await setImmediate();
  accounts.release(provider.pluginId);
  accounts.register({ ...provider, generation: 2 }, providerOptions);
  const next = accounts.token(account);

  expect(await failed).toEqual([unavailable]);
  await setImmediate();
  accounts.settle(
    { ...provider, generation: 2 },
    { id: transport.request(1).id, result: { kind: 'token', token: 'new' } },
  );
  await expect(next).resolves.toMatchObject({ value: 'Bearer new' });
});
