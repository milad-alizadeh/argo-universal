import type { KitProps } from '../../kit-props';

// Kit-only: local validation and blur handling, as TextInput.
export type DatePickerProps = KitProps<'DatePicker'> & {
  invalid?: boolean;
  onBlur?: () => void;
};

export type DatePickerMode = NonNullable<DatePickerProps['mode']>;
