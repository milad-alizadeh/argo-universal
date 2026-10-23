import type { KitProps } from '../../kit-props';

// Kit-only: the invalid mark and blur handling.
export type CheckboxProps = KitProps<'Checkbox'> & {
  invalid?: boolean;
  onBlur?: () => void;
};

export type CheckboxIndicatorProps = Pick<
  CheckboxProps,
  'value' | 'invalid' | 'disabled' | 'selection' | 'variant'
>;
