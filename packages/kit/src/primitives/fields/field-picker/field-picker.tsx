import type { ReactElement } from 'react';
import { useInMenu } from '#kit/menu-rows-context';
import { RowTitle, useRowPressable } from '#primitives/fields/field-row';
import {
  FieldPickerDrill,
  type ScreenTrigger as ScreenOpener,
} from './field-picker-drill';
import { inlineOptionRows } from './field-picker-inline-rows';
import {
  choiceSummary,
  chosenLogo,
  drawingProps,
  type FieldPickerCallerProps,
  type FieldPickerProps,
} from './field-picker-model';
import { ScreenTrigger } from './field-picker-screen-trigger';
import { FieldPickerSelect } from './field-picker-select';

/*
 * The title, a flexible Spacer, then the choice at the row's end. A `menu` of one value is the kit's borderless
 * select; a `page`, or any `multiple` choice, which a select cannot hold, opens the page's popover. Expo UI's web
 * Picker draws a bordered box it takes no style for.
 */
export function FieldPicker(props: FieldPickerCallerProps): ReactElement;
export function FieldPicker(props: FieldPickerProps): ReactElement;
export function FieldPicker(
  caller: FieldPickerCallerProps | FieldPickerProps,
): ReactElement {
  const props = drawingProps(caller);

  useRowPressable(!props.disabled && props.presentation !== 'inline');

  // Outside a Section, an `inline` choice is its option rows in place; a Section opens them first (expandInlinePickers).
  if (props.presentation === 'inline') return <>{inlineOptionRows(props)}</>;

  return <Choice {...props} />;
}

// The title and the choice are one trigger, so a click anywhere on the row opens it.
function Choice(props: FieldPickerProps): ReactElement {
  if (props.presentation === 'menu' && !props.multiple)
    return <FieldPickerSelect {...selectProps(props)} />;

  return <ScreenPicker {...props} />;
}

// In a popover the page opens beside the row on its right, behind a right chevron, as a drill (ADR-0042).
function ScreenPicker(props: FieldPickerProps): ReactElement {
  const inPopover = useInMenu();

  return (
    <FieldPickerDrill
      {...props}
      beside={inPopover}
      opener={screenTrigger(props, inPopover)}
    />
  );
}

const screenTrigger = (
  props: FieldPickerProps,
  disclosure: boolean,
): ScreenOpener => (
  <ScreenTrigger
    title={props.title}
    summary={choiceSummary(props)}
    lead={<RowTitle {...props} logo={chosenLogo(props)} />}
    disclosure={disclosure}
    disabled={props.disabled}
  />
);

const selectProps = (
  props: FieldPickerProps,
): React.ComponentProps<typeof FieldPickerSelect> => ({
  title: props.title,
  value: typeof props.value === 'string' ? props.value : '',
  options: props.options,
  onValueChange: props.onValueChange,
  disabled: props.disabled,
  lead: <RowTitle {...props} />,
});
