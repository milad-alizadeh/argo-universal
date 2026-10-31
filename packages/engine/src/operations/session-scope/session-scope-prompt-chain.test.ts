import { expect, it } from 'vitest';
import { PromptChains } from './prompt-chain';
import {
  asks,
  newScope,
  promptTo,
  runs,
  scoped,
  sessionCaller,
} from './scope-fixtures';

// Sessions in one Project, prompting each other through one set of chains.
const cascade = (chains: PromptChains) => {
  const scope = newScope(chains);

  return async (from: string, to: string): Promise<string> =>
    (await scoped(promptTo(to), sessionCaller(from), scope)).outcome;
};

// Two Sessions prompting each other back and forth, with no user in it.
const backAndForth = async (
  send: (from: string, to: string) => Promise<string>,
  hops: number,
): Promise<string[]> => {
  const outcomes: string[] = [];

  for (let hop = 0; hop < hops; hop += 1)
    outcomes.push(
      await (hop % 2 === 0
        ? send('caller', 'unrelated')
        : send('unrelated', 'caller')),
    );

  return outcomes;
};

it('prompts the Session that started it, which delegation ran only the other way', async () => {
  expect(
    (await scoped(promptTo('caller'), sessionCaller('started'))).outcome,
  ).toBe(runs);
  expect(
    (await scoped(promptTo('started'), sessionCaller('unrelated'))).outcome,
  ).toBe(runs);
});

it('asks once a Prompt chain has run ten deep with no user in it', async () => {
  const outcomes = await backAndForth(cascade(new PromptChains()), 11);

  expect(outcomes).toEqual([...Array.from({ length: 10 }, () => runs), asks]);
});

it('starts the chain again when the user prompts the Session themselves', async () => {
  const chains = new PromptChains();
  const send = cascade(chains);

  await backAndForth(send, 10);

  expect(await send('caller', 'unrelated')).toBe(asks);
  chains.cleared('unrelated');
  expect(await send('unrelated', 'caller')).toBe(runs);
});

it('leaves a Session the owner kept a Prompt from serving the chain it had', async () => {
  const chains = new PromptChains();
  const send = cascade(chains);

  await backAndForth(send, 4);

  expect(await send('caller', 'foreign')).toBe(asks);
  expect(chains.sentFrom('foreign')).toBe(1);
});
