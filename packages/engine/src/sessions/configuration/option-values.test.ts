import type { SessionConfigOption } from '@repo/contracts';
import { expect, it } from 'vitest';
import { currentModel } from '.';

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
