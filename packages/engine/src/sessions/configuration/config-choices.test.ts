import type { SessionConfigOption } from '@repo/contracts';
import { expect, it } from 'vitest';
import {
  chooseConfigValue,
  currentModel,
  holdConfigChoice,
  keepHeldConfigChoices,
  releaseHeldChoice,
  toConfigValues,
} from './config-choices';

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
const held = { argo: { heldUntilNextTurn: true } };
const applied = { argo: { heldUntilNextTurn: false } };

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

it('stores each option as its current value', (): void => {
  expect(toConfigValues([model, fastMode])).toEqual([
    { configId: 'model', value: 'fast' },
    { configId: 'fast', value: false },
  ]);
});

it.each([
  [
    'chooses a listed value',
    { configId: 'model', value: 'deep' },
    [{ ...model, currentValue: 'deep', _meta: applied }, fastMode],
  ],
  [
    'turns a switch on',
    { configId: 'fast', value: true },
    [model, { ...fastMode, currentValue: true, _meta: applied }],
  ],
  [
    'ignores a word for a switch',
    { configId: 'fast', value: 'true' },
    [model, fastMode],
  ],
  [
    'ignores a switch value for a list',
    { configId: 'model', value: true },
    [model, fastMode],
  ],
  [
    'ignores a setting the Agent did not offer',
    { configId: 'effort', value: 'high' },
    [model, fastMode],
  ],
] as const)('%s', (_name, choice, expected): void => {
  expect(chooseConfigValue([model, fastMode], choice, false)).toEqual(expected);
});

it('marks every held choice as held until the next Turn', (): void => {
  expect(
    keepHeldConfigChoices(
      [model, fastMode],
      [
        { configId: 'model', value: 'deep' },
        { configId: 'fast', value: true },
      ],
    ),
  ).toEqual([
    { ...model, currentValue: 'deep', _meta: held },
    { ...fastMode, currentValue: true, _meta: held },
  ]);
});

const deepModel = { configId: 'model', value: 'deep' };
const fastOn = { configId: 'fast', value: true };

it.each([
  {
    name: 'holds a first choice',
    current: [],
    choice: deepModel,
    kept: [deepModel],
  },
  {
    name: 'holds a choice for another setting beside the earlier one',
    current: [deepModel],
    choice: fastOn,
    kept: [deepModel, fastOn],
  },
  {
    name: 'replaces the held choice for the same setting in place',
    current: [deepModel, fastOn],
    choice: { configId: 'model', value: 'fast' },
    kept: [{ configId: 'model', value: 'fast' }, fastOn],
  },
])('$name', ({ current, choice, kept }): void => {
  expect(holdConfigChoice(current, choice)).toEqual(kept);
});

it.each([
  {
    name: 'releases the held choice for an applied setting',
    configId: 'model',
    kept: [fastOn],
  },
  {
    name: 'keeps every held choice when another setting is applied',
    configId: 'mode',
    kept: [deepModel, fastOn],
  },
])('$name', ({ configId, kept }): void => {
  expect(releaseHeldChoice([deepModel, fastOn], configId)).toEqual(kept);
});
