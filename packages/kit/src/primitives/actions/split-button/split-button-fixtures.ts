import type { SplitButtonProps } from './split-button-props';

type SplitButtonFixture = Omit<SplitButtonProps, 'actions'>;

type ChoicesSplitButtonFixture = Omit<
  Extract<SplitButtonProps, { options: readonly unknown[] }>,
  'value' | 'onValueChange'
>;

export const choicesSplitButton = {
  primary: true,
  menuLabel: 'Options',
  options: [
    { value: 'squash', label: 'Option one' },
    { value: 'merge', label: 'Option two' },
    { value: 'rebase', label: 'Option three' },
  ],
  label: 'Merge',
} satisfies ChoicesSplitButtonFixture;

export const narrowSplitButton = {
  ...choicesSplitButton,
  fullWidth: true,
} satisfies ChoicesSplitButtonFixture;

export const actionsSplitButton = {
  size: 'xs',
  primary: true,
  label: 'Merge',
  icon: 'merged',
  menuLabel: 'Options',
} satisfies SplitButtonFixture;
