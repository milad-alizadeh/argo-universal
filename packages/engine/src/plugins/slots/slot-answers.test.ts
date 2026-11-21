import {
  sessionRowSlotId,
  type SlotItemsInput,
} from '@repo/contracts/plugins/wire';
import { expect, it } from 'vitest';
import { itemsLeftOut, type Reply } from './kept-items';
import { SlotAnswers } from './slot-answers';

const input: SlotItemsInput = {
  slotId: sessionRowSlotId,
  contexts: [{ sessionId: 'first', projectId: 'argo' }],
};

const answered: Reply = {
  ok: true,
  items: { first: [{ text: 'PR 2304' }] },
};

const plugin = { pluginId: 'p', generation: 1 };

const noop = (): void => {};

const threw: Reply = { ok: false, reason: itemsLeftOut.threw };

type Run = { answers: SlotAnswers; changes: () => number };

function setup(): Run {
  let changes = 0;
  const answers = new SlotAnswers(() => (changes += 1));

  return { answers, changes: () => changes };
}

const signals = [
  ['drop', (answers: SlotAnswers): void => answers.drop('p')],
  ['askAgain', (answers: SlotAnswers): void => answers.askAgain('p', [])],
] as const;

for (const [name, signal] of signals) {
  it(`never keeps or records a reply asked before ${name}, nor counts a change`, async () => {
    const { answers, changes } = setup();
    const call = Promise.withResolvers<Reply>();

    const asked = answers.ask(plugin, input, () => call.promise);

    signal(answers);
    call.resolve(answered);

    expect(await asked).toMatchObject({ ok: true });

    // Nothing was kept: the next ask calls the Plugin again, and no last good items stand in for its failure.
    let calls = 0;

    const again = await answers.ask(plugin, input, async () => {
      calls += 1;

      return threw;
    });

    expect(calls).toBe(1);
    expect(again).toEqual(threw);
    expect(answers.standIn('p', input, again)).toEqual(threw);
    expect(changes()).toBe(0);
  });

  it(`never keeps or records a late reply asked before ${name}, nor counts a change`, async () => {
    const { answers, changes } = setup();
    let land: (reply: Reply) => void = noop;
    const call = Promise.withResolvers<Reply>();

    const asked = answers.ask(plugin, input, (_missing, late) => {
      land = late;

      return call.promise;
    });

    signal(answers);

    call.resolve({ ok: false, reason: itemsLeftOut.late });
    await asked;

    land(answered);

    let calls = 0;

    const again = await answers.ask(plugin, input, async () => {
      calls += 1;

      return threw;
    });

    expect(calls).toBe(1);
    expect(answers.standIn('p', input, again)).toEqual(threw);
    expect(changes()).toBe(0);
  });
}

it('keeps a late reply asked since the last change, records it and reports it', async () => {
  const { answers, changes } = setup();
  let land: (reply: Reply) => void = noop;

  await answers.ask(plugin, input, async (_missing, late) => {
    land = late;

    return { ok: false, reason: itemsLeftOut.late };
  });
  land(answered);

  expect(changes()).toBe(1);
  expect(
    await answers.ask(plugin, input, async () => {
      throw new Error('asked again');
    }),
  ).toEqual({ ok: true, items: answered.items });
});
