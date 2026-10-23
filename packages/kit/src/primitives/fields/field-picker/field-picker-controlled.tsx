import { useState, type ReactElement } from 'react';
import { FieldPicker } from './field-picker';
import type { FieldPickerProps } from './field-picker-model';

// A story's picker keeps its own value, so a choice shows on the row, and passes each choice on to its spy.
export function ControlledPicker(props: FieldPickerProps): ReactElement {
  const [value, setValue] = useState(props.value);

  return (
    <FieldPicker
      {...props}
      value={value}
      onValueChange={(next) => {
        setValue(next);
        props.onValueChange(next);
      }}
    />
  );
}
