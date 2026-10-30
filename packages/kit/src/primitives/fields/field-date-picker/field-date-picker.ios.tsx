import { DatePicker } from '@expo/ui/swift-ui';
import {
  accessibilityLabel,
  datePickerStyle,
  disabled,
} from '@expo/ui/swift-ui/modifiers';
import { datePickerDefaults } from '@repo/contracts/kit-tokens';
import { type ReactElement, useState } from 'react';
import { RowTitle } from '#primitives/fields/field-row';
import { isoValue, valueDate } from '#primitives/native/date-value';
import type {
  FieldDatePickerMode,
  FieldDatePickerProps,
} from './field-date-picker-props';

const components = {
  date: ['date'],
  time: ['hourAndMinute'],
  datetime: ['date', 'hourAndMinute'],
} as const satisfies Record<FieldDatePickerMode, readonly string[]>;

/*
 * Settings' date row: SwiftUI's compact DatePicker, the title at the leading edge and grey date and time pills at
 * the trailing one, opening the system calendar or wheel. SwiftUI always holds a date, so an empty row shows today
 * until it is changed.
 */
export function FieldDatePicker(props: FieldDatePickerProps): ReactElement {
  const mode = props.mode ?? datePickerDefaults.mode;

  return (
    <DatePicker
      selection={useSelection(props.value, mode)}
      displayedComponents={[...components[mode]]}
      onDateChange={(date) => props.onValueChange(isoValue(date, mode))}
      modifiers={rowModifiers(props)}
    >
      <RowTitle {...props} />
    </DatePicker>
  );
}

function useSelection(
  value: string | undefined,
  mode: FieldDatePickerMode,
): Date {
  const [today] = useState(() => new Date());

  return valueDate(value, mode) ?? today;
}

const rowModifiers = (
  props: FieldDatePickerProps,
): React.ComponentProps<typeof DatePicker>['modifiers'] => [
  datePickerStyle('compact'),
  disabled(props.disabled ?? false),
  accessibilityLabel(props.title),
];
