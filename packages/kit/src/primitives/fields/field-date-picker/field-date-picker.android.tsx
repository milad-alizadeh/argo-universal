import { type ReactElement, useState } from 'react';
import { NativeText } from '#primitives/content/native-text';
import { DateDialogs, type DialogStep } from '#primitives/native/date-dialogs';
import { displayValue } from '#primitives/native/date-value';
import {
  RowListItem,
  rowListItemProps,
} from '../field-row/field-row-list-item.android';
import type { FieldDatePickerProps } from './field-date-picker-props';

/*
 * A one-line Material row with the date as its supporting line, once there is one. Pressing it opens Material's date
 * dialog, then its time dialog for a datetime.
 */
export function FieldDatePicker(props: FieldDatePickerProps): ReactElement {
  const [step, setStep] = useState<DialogStep>('closed');

  return (
    <>
      <DateRow {...props} onOpen={() => setStep(firstStep(props))} />
      <DateDialogs
        {...props}
        step={step}
        setStep={setStep}
        close={() => setStep('closed')}
      />
    </>
  );
}

const firstStep = (props: FieldDatePickerProps): DialogStep =>
  props.mode === 'time' ? 'time' : 'date';

function DateRow(
  props: FieldDatePickerProps & { onOpen: () => void },
): ReactElement {
  return (
    <RowListItem
      {...rowListItemProps(props)}
      supporting={summary(props)}
      onPress={props.onOpen}
    />
  );
}

function summary(props: FieldDatePickerProps): ReactElement | undefined {
  const text = displayValue(props.value, props.mode);

  if (!text) return undefined;

  return (
    <NativeText role="secondary" tone="muted" numberOfLines={1}>
      {text}
    </NativeText>
  );
}
