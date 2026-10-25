import type { ReactElement } from 'react';
import { FieldPicker as FieldPickerRow } from './field-picker';
import {
  drawingProps,
  type FieldPickerCallerProps,
  type FieldPickerProps,
} from './field-picker-model';
import { FieldPickerPill } from './field-picker-pill';

/*
 * The picker: a FieldGroup row (`trigger` `row`, the default), whose drawing each platform owns, or a toolbar pill,
 * which draws the same everywhere and opens the same searchable page.
 */
export function FieldPicker(props: FieldPickerCallerProps): ReactElement;
export function FieldPicker(props: FieldPickerProps): ReactElement;
export function FieldPicker(
  caller: FieldPickerCallerProps | FieldPickerProps,
): ReactElement {
  const props = drawingProps(caller);

  if (props.trigger === 'pill') return <FieldPickerPill {...props} />;

  return <FieldPickerRow {...props} />;
}
