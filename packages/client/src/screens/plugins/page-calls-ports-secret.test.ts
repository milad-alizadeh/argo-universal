import { kitComponent } from '@repo/contracts/plugins/kit';
import {
  PageCalls,
  type PageEvent,
  type PauseClock,
  type ScopedRun,
} from '@repo/contracts/plugins/page-calls';
import type { WireNode } from '@repo/contracts/plugins/wire';
import { expect, it, onTestFinished } from 'vitest';
import {
  cacheOverMemory,
  issues,
  onScreen,
  settled,
} from './page-addresses-fixtures';
import { pageCallsPorts } from './page-calls-ports';

const token = 'pasted-api-token-7d02';

// A sign-in page whose SecretField's text goes to the secret `token` param of `saveToken` (ADR-0051).
const signInPage = (): WireNode => ({
  type: 'Stack',
  key: 'page',
  props: {},
  slots: {},
  children: [
    {
      type: 'FieldGroup.SecretField',
      key: 'token',
      props: {
        title: 'API token',
        value: '',
        onChangeText: {
          operation: 'saveToken',
          args: { token: { $payload: true } },
        },
      },
      children: [],
      slots: {},
    },
  ],
});

function secretTyping(): PageEvent['schema'] {
  const schema = kitComponent('FieldGroup.SecretField')?.events.onChangeText;

  if (!schema) throw new Error('SecretField has no onChangeText');

  return schema;
}

// Typing the token into the SecretField.
const typingToken: PageEvent = {
  key: 'page/token',
  name: 'onChangeText',
  schema: secretTyping(),
  payload: token,
};

// The typing pause passes on the next turn.
const nextTurn: PauseClock = (_ms, fire) => {
  const timer = setTimeout(() => void fire(), 0);

  return () => clearTimeout(timer);
};

it('runs a typed secret and leaves it nowhere in the query cache once the run answers', async () => {
  const cache = cacheOverMemory();
  const runs: ScopedRun[] = [];

  cache.server.tree = signInPage;

  const screen = onScreen(cache, issues);

  const calls = new PageCalls(
    pageCallsPorts(cache.addresses, issues, {
      run: (run) => {
        runs.push(run);

        return Promise.resolve({ result: { saved: true } });
      },
      failed: (error) => {
        throw error;
      },
    }),
    nextTurn,
  );

  onTestFinished(() => {
    calls.close();
    screen.leave();
  });
  await settled();

  await calls.call({ operation: 'saveToken', args: { token } }, typingToken);
  await settled();

  expect(runs).toMatchObject([{ operation: 'saveToken', args: { token } }]);

  const queries = cache.client.getQueryCache().getAll();
  const mutations = cache.client.getMutationCache().getAll();

  expect(queries.length).toBeGreaterThan(0);
  expect(
    JSON.stringify(
      queries.map(({ queryKey, state }) => [queryKey, state.data]),
    ),
  ).not.toContain(token);
  expect(JSON.stringify(mutations.map(({ state }) => state))).not.toContain(
    token,
  );
});
