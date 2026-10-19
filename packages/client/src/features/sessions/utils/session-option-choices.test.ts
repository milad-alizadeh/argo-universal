import { recordedSessionOptions } from '@repo/mocks/app';
import { describe, expect, it } from 'vitest';
import { initialConfigOptions } from './session-option-choices';

// The recorded Agent lists mode, then model, then effort.
const options = recordedSessionOptions('agent-one');

describe('A Session opened with the reader’s choices', () => {
  it('takes them model before effort before mode', () => {
    expect(
      initialConfigOptions(options).map(({ configId }) => configId),
    ).toEqual(['model', 'effort', 'mode']);
  });
});
