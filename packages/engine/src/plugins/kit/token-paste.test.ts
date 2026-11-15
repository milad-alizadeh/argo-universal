import type { TokenPasteArgo } from '@repo/contracts/plugins/token-paste-api';
import { expect, it } from 'vitest';
import { tokenPaste } from './token-paste';

type Gate = PromiseWithResolvers<void>;

// A Plugin's calls that keep what they were given, with a gate before an Account's add or a token's check answers.
function fakeArgo(addGates: Map<string, Gate>): {
  argo: TokenPasteArgo;
  added: string[];
  secrets: Map<string, string>;
} {
  const added: string[] = [];
  const secrets = new Map<string, string>();

  const argo: TokenPasteArgo = {
    changed: () => undefined,
    accounts: {
      add: async (_host, { label }) => {
        added.push(label);
        await addGates.get(label)?.promise;

        return `account-${label}`;
      },
      provide: async () => undefined,
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

const people: Record<string, string> = {
  'token-alice': 'alice',
  'token-bob': 'bob',
};

it('adds no Account for a paste a newer one overtakes while its token is checked', async () => {
  const { argo, added, secrets } = fakeArgo(new Map());
  const checking = Promise.withResolvers<void>();

  const flow = tokenPaste(argo, {
    host: 'api.service.example',
    header,
    label: async (token) => {
      if (token === 'token-alice') await checking.promise;

      return people[token] ?? null;
    },
  });

  const first = flow.start('token-alice');

  await flow.start('token-bob');
  checking.resolve();
  await first;

  expect(added).toEqual(['bob']);
  expect([...secrets]).toEqual([['account-bob', 'token-bob']]);
  expect(flow.state()).toEqual({ kind: 'signed-in', label: 'bob' });
});

it('keeps no token for a paste a newer one overtakes while its Account is added', async () => {
  const adding: Gate = Promise.withResolvers<void>();
  const { argo, added, secrets } = fakeArgo(new Map([['alice', adding]]));

  const flow = tokenPaste(argo, {
    host: 'api.service.example',
    header,
    label: async (token) => people[token] ?? null,
  });

  const first = flow.start('token-alice');

  await expect.poll(() => added).toEqual(['alice']);
  await flow.start('token-bob');
  adding.resolve();
  await first;

  expect([...secrets]).toEqual([['account-bob', 'token-bob']]);
  expect(flow.state()).toEqual({ kind: 'signed-in', label: 'bob' });
});
