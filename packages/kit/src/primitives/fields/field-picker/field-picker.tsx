import type { ReactElement } from 'react';
import { RowTitle, useRowPressable } from '#primitives/fields/field-row';
import { FieldPickerDrill } from './field-picker-drill';
import { inlineOptionRows } from './field-picker-inline-rows';
import {
  choiceSummary,
  widened,
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
  const props = widened(caller);

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

function ScreenPicker(props: FieldPickerProps): ReactElement {
  return (
    <FieldPickerDrill
      {...props}
      opener={
        <ScreenTrigger
          title={props.title}
          summary={choiceSummary(props)}
          lead={<RowTitle {...props} />}
          disabled={props.disabled}
        />
      }
    />
  );
}

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
