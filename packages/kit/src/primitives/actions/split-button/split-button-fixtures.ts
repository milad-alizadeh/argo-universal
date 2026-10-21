import type { SplitButtonProps } from './split-button-props';

type SplitButtonFixture = Omit<SplitButtonProps, 'actions'>;

export const actionsSplitButton = {
  size: 'xs',
  primary: true,
  label: 'Merge',
  icon: 'merged',
  menuLabel: 'Options',
} satisfies SplitButtonFixture;
