// SwiftUI's compact DatePicker: grey date and time pills that open the system calendar or wheel.
import { Row, Spacer } from '@expo/ui';
import { DatePicker as SwiftDatePicker } from '@expo/ui/swift-ui';
import {
  accessibilityLabel,
  datePickerStyle,
  disabled,
  labelsHidden,
} from '@expo/ui/swift-ui/modifiers';
import { useState, type ReactElement } from 'react';
import { NativeText } from '#primitives/content/native-text';
import { Host } from '#primitives/native/host';
import { requiredLabel } from '../../../required-label';
import type { DatePickerMode, DatePickerProps } from './date-picker-props';
import { isoValue, valueDate } from './date-picker-value';

const components = {
  date: ['date'],
  time: ['hourAndMinute'],
  datetime: ['date', 'hourAndMinute'],
} as const satisfies Record<DatePickerMode, readonly string[]>;

export function DatePicker(props: DatePickerProps): ReactElement {
  return (
    <Host matchContents={{ vertical: true }} style={{ flex: 1 }}>
      <Row alignment="center">
        <NativeText tone={props.invalid ? 'danger' : undefined}>
          {requiredLabel(props)}
        </NativeText>
        <Spacer />
        <CompactPicker {...props} mode={props.mode ?? 'date'} />
      </Row>
    </Host>
  );
}

type PickerProps = DatePickerProps & { mode: DatePickerMode };

// SwiftUI always holds a date, so an empty field shows today until changed.
function CompactPicker(props: PickerProps): ReactElement {
  const [today] = useState(() => new Date());

  return (
    <SwiftDatePicker
      selection={valueDate(props.value, props.mode) ?? today}
      displayedComponents={[...components[props.mode]]}
      onDateChange={(date) => props.onValueChange?.(isoValue(date, props.mode))}
      modifiers={pickerModifiers(props)}
    />
  );
}

const pickerModifiers = (
  props: PickerProps,
): React.ComponentProps<typeof SwiftDatePicker>['modifiers'] => [
  datePickerStyle('compact'),
  labelsHidden(),
  disabled(props.disabled),
  accessibilityLabel(props.label),
];
