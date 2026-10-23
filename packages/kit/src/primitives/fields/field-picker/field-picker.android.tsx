import { useState, type ReactElement } from 'react';
import { FieldPickerDialog } from './field-picker-dialog.android';
import type {
  FieldPickerCallerProps,
  FieldPickerProps,
} from './field-picker-model';
import { NativePicker, rowProps } from './field-picker-native';
import { ChoiceRow } from './field-picker-row.android';

/*
 * A `menu` is Android Settings' ListPreference: the row shows the value as its supporting line, and pressing it
 * opens a dialog of radio buttons (checkboxes when `multiple`). A `page` opens its page (see NativePicker).
 */
export function FieldPicker(props: FieldPickerCallerProps): ReactElement;
export function FieldPicker(props: FieldPickerProps): ReactElement;
export function FieldPicker(
  caller: FieldPickerCallerProps | FieldPickerProps,
): ReactElement {
  return <NativePicker caller={caller} menu={DialogPicker} row={ChoiceRow} />;
}

function DialogPicker(props: FieldPickerProps): ReactElement {
  const [open, setOpen] = useState(false);

  return (
    <>
      <ChoiceRow {...rowProps(props)} onPress={() => setOpen(true)} />
      {open ? (
        <FieldPickerDialog {...props} onClose={() => setOpen(false)} />
      ) : null}
    </>
  );
}
