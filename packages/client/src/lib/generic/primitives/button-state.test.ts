import { describe, expect, it } from 'vitest';
import { readyPress } from './button-state';

const press = (): void => undefined;

describe('a native button press', () => {
  it.each([
    { state: 'ready', props: { onPress: press }, expected: press },
    {
      state: 'loading',
      props: { onPress: press, loading: true },
      expected: undefined,
    },
    {
      state: 'disabled',
      props: { onPress: press, disabled: true },
      expected: undefined,
    },
  ])('reaches the handler only when the button is $state', (row) => {
    expect(readyPress(row.props)).toBe(row.expected);
  });
});
