import { Row, Spacer } from '@expo/ui';
import { createElement, type ReactElement } from 'react';
import { RowTitle } from '#primitives/fields/field-row';
import { inputType } from '#primitives/native/date-value';
import type { FieldDatePickerProps } from './field-date-picker-props';

/*
 * The title, then the browser's own date, time or datetime-local input at the row's end, as iOS's compact picker sits
 * in its row: the browser formats the value and draws its picker.
 */
export function FieldDatePicker(props: FieldDatePickerProps): ReactElement {
  return (
    <Row alignment="center">
      <RowTitle {...props} />
      <Spacer flexible />
      <DateInput {...props} />
    </Row>
  );
}

const inputClasses =
  'type-body min-w-0 bg-transparent text-foreground outline-none disabled:text-muted-foreground';

function DateInput(props: FieldDatePickerProps): ReactElement {
  return createElement('input', {
    type: inputType(props.mode),
    value: props.value ?? '',
    disabled: props.disabled,
    'aria-label': props.title,
    className: inputClasses,
    onChange: (event: React.ChangeEvent<HTMLInputElement>) =>
      props.onValueChange(event.target.value),
  });
}
