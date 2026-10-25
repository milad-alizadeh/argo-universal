import {
  isValidElement,
  type ComponentType,
  type ReactElement,
  type ReactNode,
} from 'react';
import { useInMenu } from '#kit/menu-rows-context';
import { useRowPressable } from '#primitives/fields/field-row';
import { pickerDrawing } from './field-picker-drawing';
import { FieldPickerDrill } from './field-picker-drill';
import { pickerKind, rowProps, type PickerKind } from './field-picker-kind';
import {
  narrowed,
  type FieldPickerCallerProps,
  type FieldPickerProps,
  type PickerProps,
} from './field-picker-model';
import { FieldPickerPill } from './field-picker-pill';

const { Row, Menu, OptionRow, menuHoldsMultiple } = pickerDrawing;

const kindOf = (props: PickerProps): PickerKind =>
  pickerKind({
    presentation: props.presentation,
    multiple: props.multiple,
    trigger: props.trigger,
    menuHoldsMultiple,
  });

/*
 * The picker: the caller's value is narrowed once, then its kind picks the drawing: a toolbar pill, the options as
 * rows of the enclosing section, the platform's menu, or the page the row opens (ADR-0042). The platform's
 * drawing (field-picker-drawing) holds the row, the menu and the option row.
 */
export function FieldPicker(props: FieldPickerCallerProps): ReactElement;
export function FieldPicker(props: FieldPickerProps): ReactElement;
export function FieldPicker(
  caller: FieldPickerCallerProps | FieldPickerProps,
): ReactElement {
  const props = narrowed(caller);
  const kind = kindOf(props);
  const Drawing = drawings[kind];

  useRowPressable(!props.disabled && kind !== 'inline');

  return <Drawing {...props} />;
}

const InlineRows = (props: PickerProps): ReactElement => (
  <>{inlineOptionRows(props)}</>
);

const drawings: Record<PickerKind, ComponentType<PickerProps>> = {
  pill: FieldPickerPill,
  inline: InlineRows,
  menu: Menu,
  page: PagePicker,
};

/*
 * The options of an `inline` picker as the rows of the section that holds it. The rows sit beside other pickers'
 * rows, so each key names its picker as well as its option.
 */
const inlineOptionRows = (props: PickerProps): ReactElement[] =>
  props.options.map((option) => (
    <OptionRow
      key={`${props.title}:${option.value}`}
      {...props}
      option={option}
    />
  ));

// In a popover the page opens beside the row on its right, behind a right chevron, as a drill (ADR-0042).
function PagePicker(props: PickerProps): ReactElement {
  return (
    <FieldPickerDrill
      {...props}
      beside={useInMenu()}
      opener={<Row {...rowProps(props)} />}
    />
  );
}

/*
 * A Section counts and frames its children as rows, so an `inline` picker, which is several rows, is opened into
 * one row per option before the Section reads them.
 */
export const expandInlinePickers = (rows: ReactNode[]): ReactNode[] =>
  rows.flatMap(opened);

function opened(row: ReactNode): ReactNode[] {
  const props = pickerOf(row);

  return props && kindOf(props) === 'inline' ? inlineOptionRows(props) : [row];
}

const pickerOf = (row: ReactNode): PickerProps | undefined =>
  isValidElement<FieldPickerProps>(row) && row.type === FieldPicker
    ? narrowed(row.props)
    : undefined;
