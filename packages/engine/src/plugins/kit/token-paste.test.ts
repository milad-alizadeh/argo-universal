import type { TokenPasteArgo } from '@repo/contracts/plugins/token-paste-api';
import { expect, it, vi } from 'vitest';
import { tokenPaste } from './token-paste';

type Gate = PromiseWithResolvers<void>;

// What the fake keeps: the labels of the Accounts added, and each Account's kept token.
type Fake = {
  argo: TokenPasteArgo;
  added: string[];
  secrets: Map<string, string>;
};

// A Plugin's calls that keep what they were given, with a gate before an Account's add answers.
function fakeArgo(addGates: Map<string, Gate>): Fake {
  const added: string[] = [];
  const secrets = new Map<string, string>();

  const argo: TokenPasteArgo = {
    changed: vi.fn<() => void>(),
    accounts: {
      add: async (_host, { label }) => {
        added.push(label);
        await addGates.get(label)?.promise;

        return `account-${label}`;
      },
      provide: vi.fn<() => Promise<void>>(() => Promise.resolve()),
    },
    secrets: {
      get: async (id) => secrets.get(id) ?? null,
      set: async (id, value) => {
        secrets.set(id, value);
      },
    },
  };

  return { argo, added, secrets };
}

const header = { header: 'Authorization', prefix: 'Bearer' };

const host = 'api.service.example';

const alice = 'token-alice';

const bob = 'token-bob';

const bobsAccount = 'account-bob';

const people = new Map([
  [alice, 'alice'],
  [bob, 'bob'],
]);

it('adds no Account for a paste a newer one overtakes while its token is checked', async () => {
  const { argo, added, secrets } = fakeArgo(new Map());
  const checking = Promise.withResolvers<void>();

  const flow = tokenPaste(argo, {
    host,
    header,
    label: async (token) => {
      if (token === alice) await checking.promise;

      return people.get(token) ?? null;
    },
  });

  const first = flow.start(alice);

  await flow.start(bob);
  checking.resolve();
  await first;

  expect(added).toEqual(['bob']);
  expect([...secrets]).toEqual([[bobsAccount, bob]]);
  expect(flow.state()).toEqual({
    kind: 'signed-in',
    label: 'bob',
    accountId: bobsAccount,
  });
});

it('keeps no token for a paste a newer one overtakes while its Account is added', async () => {
  const adding: Gate = Promise.withResolvers<void>();
  const { argo, added, secrets } = fakeArgo(new Map([['alice', adding]]));

  const flow = tokenPaste(argo, {
    host,
    header,
    label: async (token) => people.get(token) ?? null,
  });

  const first = flow.start(alice);

  await expect.poll(() => added).toEqual(['alice']);
  await flow.start(bob);
  adding.resolve();
  await first;

  expect([...secrets]).toEqual([[bobsAccount, bob]]);
  expect(flow.state()).toEqual({
    kind: 'signed-in',
    label: 'bob',
    accountId: bobsAccount,
  });
});
