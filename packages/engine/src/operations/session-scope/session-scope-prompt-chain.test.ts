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

it('prompts the Session that started it, which delegation ran only the other way', async () => {
  expect(
    (await scoped(promptTo('caller'), sessionCaller('started'))).outcome,
  ).toBe(runs);
  expect(
    (await scoped(promptTo('started'), sessionCaller('unrelated'))).outcome,
  ).toBe(runs);
});

it('asks once a Prompt chain has run ten deep with no user in it', async () => {
  const chains = new PromptChains();
  const send = cascade(chains);
  const outcomes: string[] = [];

  for (let hop = 0; hop < 11; hop += 1)
    outcomes.push(
      await (hop % 2 === 0
        ? send('caller', 'unrelated')
        : send('unrelated', 'caller')),
    );

  expect(outcomes).toEqual([...Array.from({ length: 10 }, () => runs), asks]);
});

it('starts the chain again when the user prompts the Session themselves', async () => {
  const chains = new PromptChains();
  const send = cascade(chains);

  for (let hop = 0; hop < 10; hop += 1)
    await (hop % 2 === 0
      ? send('caller', 'unrelated')
      : send('unrelated', 'caller'));

  expect(await send('caller', 'unrelated')).toBe(asks);
  chains.cleared('unrelated');
  expect(await send('unrelated', 'caller')).toBe(runs);
});

it('leaves a Session answering the user one Prompt deep', async () => {
  const chains = new PromptChains();

  expect(chains.next('caller')).toBe(1);
  expect(chains.exceeded(1)).toBe(false);
});
