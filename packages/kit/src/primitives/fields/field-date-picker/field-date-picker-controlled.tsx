import { type ReactElement, useState } from 'react';
import { FieldDatePicker } from './field-date-picker';
import type { FieldDatePickerProps } from './field-date-picker-props';

// A DatePicker row is controlled, so its stories and tests draw it through a wrapper that keeps the picked value.
export function ControlledDatePicker(
  props: FieldDatePickerProps,
): ReactElement {
  const [value, setValue] = useState(props.value);

  const change = (next: string): void => {
    setValue(next);
    props.onValueChange(next);
  };

  return <FieldDatePicker {...props} value={value} onValueChange={change} />;
}
