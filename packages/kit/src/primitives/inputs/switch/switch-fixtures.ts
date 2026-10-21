import type { SwitchProps } from './switch-props';

type SwitchFixture = Omit<SwitchProps, 'onValueChange'>;

const accessibilityLabel = 'Accept terms and conditions';

export const offSwitch = {
  value: false,
  accessibilityLabel,
} satisfies SwitchFixture;

export const onSwitch = {
  value: true,
  accessibilityLabel,
} satisfies SwitchFixture;

export const smallOffSwitch = {
  value: false,
  accessibilityLabel,
  size: 'sm',
} satisfies SwitchFixture;

export const smallOnSwitch = {
  value: true,
  accessibilityLabel,
  size: 'sm',
} satisfies SwitchFixture;

export const disabledSwitch = {
  value: false,
  accessibilityLabel,
  disabled: true,
} satisfies SwitchFixture;
