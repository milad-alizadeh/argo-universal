import type { FieldGroupKitProps } from '../../kit-props';

// A DatePicker row's props on every platform.
export type FieldDatePickerProps = FieldGroupKitProps<'FieldGroup.DatePicker'>;

export type FieldDatePickerMode = NonNullable<FieldDatePickerProps['mode']>;
