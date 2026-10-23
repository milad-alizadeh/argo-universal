import { isValidElement, type ReactElement, type ReactNode } from 'react';
import { inlineOptionRows } from './field-picker-inline-rows';
import { widened, type FieldPickerProps } from './field-picker-model';
import { FieldPicker } from './field-picker-switch';

/*
 * A Section counts and frames its children as rows, so an `inline` picker, which is several rows, is opened into
 * one row per option before the Section reads them (web and Android; SwiftUI's Form lays the rows out itself).
 */
export const expandInlinePickers = (rows: ReactNode[]): ReactNode[] =>
  rows.flatMap(opened);

function opened(row: ReactNode): ReactNode[] {
  const props = inlinePicker(row);

  return props ? inlineOptionRows(props) : [row];
}

const isPicker = (row: ReactNode): row is ReactElement<FieldPickerProps> =>
  isValidElement(row) && row.type === FieldPicker;

const inlinePicker = (row: ReactNode): FieldPickerProps | undefined =>
  isPicker(row) ? inlineOnly(widened(row.props)) : undefined;

const inlineOnly = (props: FieldPickerProps): FieldPickerProps | undefined =>
  props.presentation === 'inline' ? props : undefined;
