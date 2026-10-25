import { useState, type ReactElement } from 'react';
import { FieldPickerDialog } from './field-picker-dialog.android';
import { OptionRow } from './field-picker-inline-row.android';
import { rowProps, type PickerDrawing } from './field-picker-kind';
import type { PickerProps } from './field-picker-model';
import { ChoiceRow } from './field-picker-row.android';

/*
 * A `menu` is Android Settings' ListPreference: the row shows the value as its supporting line, and pressing it
 * opens a dialog of radio buttons (checkboxes when `multiple`). A `page` opens its page from the same row.
 */
function DialogPicker(props: PickerProps): ReactElement {
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

export const pickerDrawing: PickerDrawing = {
  Row: ChoiceRow,
  Menu: DialogPicker,
  OptionRow,
  menuHoldsMultiple: true,
};
