import { expect, it } from 'vitest';
import { nativeStepperRange } from './stepper-native-range';

const onValueChange = (): void => {};

it('keeps an unbounded count above the SDK default maximum', () => {
  expect(
    nativeStepperRange({ title: 'Count', value: 150, onValueChange }),
  ).toEqual({
    value: 150,
    step: 1,
    min: Number.MIN_SAFE_INTEGER,
    max: Number.MAX_SAFE_INTEGER,
  });
});

it.each([
  { value: 0.5, step: 0.5 },
  { value: 1, min: 0.5 },
  { value: 1, max: 1.5 },
  { value: Number.MAX_VALUE },
  { value: 3, max: 2 },
])(
  'keeps unsupported numbers out of the native integer bridge: %o',
  (props) => {
    expect(
      nativeStepperRange({ title: 'Count', onValueChange, ...props }),
    ).toBeUndefined();
  },
);

it('preserves explicit integer bounds and increment', () => {
  expect(
    nativeStepperRange({
      title: 'Count',
      value: 4,
      min: 0,
      max: 8,
      step: 2,
      onValueChange,
    }),
  ).toEqual({
    value: 4,
    min: 0,
    max: 8,
    step: 2,
  });
});
