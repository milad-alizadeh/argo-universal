import type { SegmentedControlProps } from './segmented-control-props';

export const defaultSegmentedControl = {
  label: 'Git',
  options: [
    { value: 'pr', label: 'PR' },
    { value: 'files', label: 'File changes' },
  ],
  value: 'files',
} satisfies Omit<SegmentedControlProps, 'onValueChange'>;
