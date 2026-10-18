import { describe, expect, it } from 'vitest';
import { isButtonDisabled } from './button-state';

describe('a native button', () => {
  it.each([
    { state: 'ready', props: {}, expected: false },
    { state: 'loading', props: { loading: true }, expected: true },
    { state: 'disabled', props: { disabled: true }, expected: true },
  ])('is disabled: $expected when $state', (row) => {
    expect(isButtonDisabled(row.props)).toBe(row.expected);
  });
});
