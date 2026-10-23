import { useState, type ReactElement } from 'react';
import { useOptionalSheet } from '#primitives/overlays/sheet';
import { FieldPickerDialog } from './field-picker-dialog.android';
import { FieldPickerDrill } from './field-picker-drill';
import {
  choiceSummary,
  widened,
  type FieldPickerCallerProps,
  type FieldPickerProps,
} from './field-picker-model';
import { ChoiceRow } from './field-picker-row.android';
import { SheetPicker } from './field-picker-sheet';

/*
 * A `menu` is Android Settings' ListPreference: the row shows the value as its supporting line, and pressing it
 * opens a dialog of radio buttons (checkboxes when `multiple`). A `page` always opens its page: pushed in the
 * enclosing Sheet, or on a Sheet of its own when none encloses the row. It never changes with its parent (ADR-0042).
 */
export function FieldPicker(props: FieldPickerCallerProps): ReactElement;
export function FieldPicker(props: FieldPickerProps): ReactElement;
export function FieldPicker(
  caller: FieldPickerCallerProps | FieldPickerProps,
): ReactElement {
  const props = widened(caller);
  const sheet = useOptionalSheet();

  if (props.presentation === 'menu') return <DialogPicker {...props} />;

  return sheet ? <PagePicker {...props} /> : <SheetPage {...props} />;
}

type RowProps = React.ComponentProps<typeof ChoiceRow>;

const rowProps = (props: FieldPickerProps): RowProps => ({
  title: props.title,
  leading: props.leading,
  summary: choiceSummary(props),
  disabled: props.disabled,
});

function PagePicker(props: FieldPickerProps): ReactElement {
  return (
    <FieldPickerDrill {...props} trigger={<ChoiceRow {...rowProps(props)} />} />
  );
}

function SheetPage(props: FieldPickerProps): ReactElement {
  return (
    <SheetPicker
      {...props}
      row={(opening) => <ChoiceRow {...rowProps(props)} {...opening} />}
    />
  );
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
