import type { InitialConfigOption, SessionConfigOption } from '@repo/contracts';
import { describe, expect, it } from 'vitest';
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

const modelSwitch: SessionConfigOption = {
  type: 'boolean',
  configId: 'model',
  name: 'Model',
  category: 'model',
  currentValue: true,
};

const chosen = (
  value: string | boolean,
  optional = false,
): InitialConfigOption => ({ configId: 'model', value, optional });

describe('modelCorrectionToast', () => {
  it('names the model the Agent runs instead of the one chosen', () => {
    expect(modelCorrectionToast([chosen('haiku')], [model('sonnet')])).toEqual({
      title: 'The Agent changed the Model',
      message: 'It runs Sonnet 5.5 instead of Haiku 5.5.',
    });
  });

  it('names a model the options do not list by its value', () => {
    expect(modelCorrectionToast([chosen('opus')], [model('sonnet')])).toEqual({
      title: 'The Agent changed the Model',
      message: 'It runs Sonnet 5.5 instead of opus.',
    });
  });

  it.each([
    {
      case: 'the Agent runs the model the reader chose',
      initial: [chosen('haiku')],
      live: [model('haiku')],
    },
    {
      case: 'a model the reader never picked',
      initial: [chosen('haiku', true)],
      live: [model('sonnet')],
    },
    {
      case: 'an option that is not the model',
      initial: [{ configId: 'mode', value: 'plan', optional: false }],
      live: [mode],
    },
    {
      case: 'options with no model',
      initial: [chosen('haiku')],
      live: [mode],
    },
    {
      case: 'a model option that is a switch',
      initial: [chosen(true)],
      live: [modelSwitch],
    },
  ])('says nothing for $case', ({ initial, live }) => {
    expect(modelCorrectionToast(initial, live)).toBeUndefined();
  });
});
