import { recordedSessionOptions } from '@repo/mocks/app';
import { describe, expect, it } from 'vitest';
import {
  changeKey,
  chosenOptions,
  initialConfigOptions,
  nextConfigChange,
} from './session-option-choices';

// The recorded Agent lists mode, then model, then effort.
const options = recordedSessionOptions('agent-one');

const picked = chosenOptions(options, {}, { mode: 'plan', model: 'haiku' });

describe('A Session opened with the reader’s choices', () => {
  it('takes them model before effort before mode', () => {
    expect(
      initialConfigOptions(options).map(({ configId }) => configId),
    ).toEqual(['model', 'effort', 'mode']);
  });
});

describe('The next choice an open Session lacks', () => {
  it('is the model before the mode', () => {
    expect(nextConfigChange(options, picked, new Set())).toEqual({
      configId: 'model',
      value: 'haiku',
    });
  });

  it('skips a value already tried', () => {
    const tried = new Set([changeKey({ configId: 'model', value: 'haiku' })]);

    expect(nextConfigChange(options, picked, tried)).toEqual({
      configId: 'mode',
      value: 'plan',
    });
  });

  it('is nothing for a value the Session does not offer', () => {
    const unoffered = chosenOptions(options, {}, { mode: 'yolo' });

    expect(nextConfigChange(options, unoffered, new Set())).toBeUndefined();
  });
});
