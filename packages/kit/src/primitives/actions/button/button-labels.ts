import type { ButtonProps } from './button';

type Variant = NonNullable<ButtonProps['variant']>;

export type LabelColor =
  | 'primaryForeground'
  | 'foreground'
  | 'primary'
  | 'danger'
  | 'disabledContent';

const enabledColors: Record<Variant, LabelColor> = {
  primary: 'primaryForeground',
  secondary: 'foreground',
  text: 'primary',
  danger: 'danger',
};

const disabledColors: Record<Variant, LabelColor> = {
  primary: 'disabledContent',
  secondary: 'disabledContent',
  text: 'disabledContent',
  danger: 'disabledContent',
};

// Each variant's label colour, by disabled. The theme decides what disabledContent is on each platform.
export const labelColors = { false: enabledColors, true: disabledColors };
