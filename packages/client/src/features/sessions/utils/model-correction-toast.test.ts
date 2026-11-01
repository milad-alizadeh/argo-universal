import type { InitialConfigOption, SessionConfigOption } from '@repo/contracts';
import { expect, it } from 'vitest';
import { modelCorrectionToast } from './model-correction-toast';

const model = (currentValue: string): SessionConfigOption => ({
  type: 'select',
  configId: 'model',
  name: 'Model',
  category: 'model',
  currentValue,
  options: [
    { value: 'haiku', name: 'Haiku 5.5' },
    { value: 'sonnet', name: 'Sonnet 5.5' },
  ],
});

const mode: SessionConfigOption = {
  type: 'select',
  configId: 'mode',
  name: 'Mode',
  category: 'mode',
  currentValue: 'default',
  options: [{ value: 'default', name: 'Ask first' }],
};

const chosen = (value: string, optional = false): InitialConfigOption => ({
  configId: 'model',
  value,
  optional,
});

it('says nothing when the Agent runs the model the reader chose', () => {
  expect(
    modelCorrectionToast([chosen('haiku')], [model('haiku')]),
  ).toBeUndefined();
});

it('names the model the Agent runs instead of the one chosen', () => {
  expect(modelCorrectionToast([chosen('haiku')], [model('sonnet')])).toEqual({
    title: 'The Agent changed the Model',
    message: 'It runs Sonnet 5.5 instead of Haiku 5.5.',
  });
});

it('says nothing about a model the reader never picked', () => {
  expect(
    modelCorrectionToast([chosen('haiku', true)], [model('sonnet')]),
  ).toBeUndefined();
});

it('says nothing about an option that is not the model', () => {
  expect(
    modelCorrectionToast(
      [{ configId: 'mode', value: 'plan', optional: false }],
      [mode],
    ),
  ).toBeUndefined();
});
