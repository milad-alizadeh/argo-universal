import type { SessionConfigOption } from '@repo/contracts';
import { expect, it } from 'vitest';
import { currentModel, hasConfigurationCapacity } from '.';

const model: SessionConfigOption = {
  configId: 'model',
  name: 'Model',
  category: 'model',
  type: 'select',
  currentValue: 'fast',
  options: [
    { value: 'fast', name: 'Fast' },
    { value: 'deep', name: 'Deep' },
  ],
};

const fastMode: SessionConfigOption = {
  configId: 'fast',
  name: 'Fast mode',
  type: 'boolean',
  currentValue: false,
};

const mode: SessionConfigOption = {
  configId: 'mode',
  name: 'Mode',
  category: 'mode',
  type: 'select',
  currentValue: 'ask',
  options: [{ value: 'ask', name: 'Ask' }],
};

it.each([
  ['the chosen model', [mode, model], 'fast'],
  ['no model when none is offered', [mode], null],
  [
    'no model when the model is a switch',
    [{ ...fastMode, category: 'model' }],
    null,
  ],
] as const)('reads %s', (_name, options, expected): void => {
  expect(currentModel([...options])).toBe(expected);
});

const queued = (count: number): { configId: string; value: string }[] =>
  Array.from({ length: count }, (_, index) => ({
    configId: `option-${index}`,
    value: 'on',
  }));

const queuedChoices = (
  count: number,
): Parameters<typeof hasConfigurationCapacity>[0]['configQueue'] =>
  queued(count).map((choice) => ({
    type: 'session.setConfigOption',
    ...choice,
  }));

it.each([
  { name: 'admits a choice into an empty queue', waiting: 0, held: 0 },
  { name: 'admits the thirty-second pending choice', waiting: 20, held: 11 },
])('$name', ({ waiting, held }): void => {
  expect(
    hasConfigurationCapacity({
      configQueue: queuedChoices(waiting),
      heldConfig: queued(held),
    }),
  ).toBe(true);
});

it('refuses a choice when queued and held choices fill the queue', (): void => {
  expect(
    hasConfigurationCapacity({
      configQueue: queuedChoices(20),
      heldConfig: queued(12),
    }),
  ).toBe(false);
});
