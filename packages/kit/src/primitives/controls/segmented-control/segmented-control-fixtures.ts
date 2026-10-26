import type { SegmentedControlProps } from './segmented-control-props';

export const defaultSegmentedControl = {
  label: 'Label',
  options: [
    { value: 'first', label: 'First' },
    { value: 'second', label: 'Second' },
  ],
  value: 'second',
} satisfies Omit<SegmentedControlProps, 'onValueChange'>;

export const disabledSegmentedControl = {
  ...defaultSegmentedControl,
  disabled: true,
};
