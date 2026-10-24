// Android only: Material's stock date and time dialogs, opened by the DatePicker row and by the input DatePicker.
import { DatePickerDialog, TimePickerDialog } from '@expo/ui/jetpack-compose';
import { type ReactElement, useState } from 'react';
import {
  type DateMode,
  isoValue,
  valueDate,
} from '#primitives/native/date-value';

export type DialogStep = 'closed' | 'date' | 'time';

type DialogProps = {
  value?: string;
  mode?: DateMode;
  onValueChange?: (value: string) => void;
  step: DialogStep;
  setStep: (step: DialogStep) => void;
  close: () => void;
};

export function DateDialogs(props: DialogProps): ReactElement | null {
  const [now] = useState(() => new Date());

  if (props.step === 'closed') return null;

  return (
    <OpenDialog
      {...props}
      current={valueDate(props.value, props.mode) ?? now}
    />
  );
}

function OpenDialog(props: DialogProps & { current: Date }): ReactElement {
  const [day, setDay] = useState<Date>();

  if (props.step === 'date') return <DayDialog {...props} onDay={setDay} />;

  return <TimeDialog {...props} current={day ?? props.current} />;
}

type DayProps = DialogProps & { current: Date; onDay: (day: Date) => void };

// A date alone commits; a datetime keeps the day, at the time it held, and asks for the time.
function chooseDay(props: DayProps, picked: Date): void {
  const day = localDay(picked);

  if (props.mode === 'datetime') {
    props.onDay(withTime(day, props.current));
    props.setStep('time');

    return;
  }

  props.onValueChange?.(isoValue(day, 'date'));
  props.close();
}

function DayDialog(props: DayProps): ReactElement {
  return (
    <DatePickerDialog
      initialDate={utcDay(props.current)}
      onDismissRequest={props.close}
      onDateSelected={(picked) => chooseDay(props, picked)}
    />
  );
}

function TimeDialog(props: DialogProps & { current: Date }): ReactElement {
  const choose = (picked: Date): void => {
    props.onValueChange?.(
      isoValue(withTime(props.current, picked), props.mode),
    );
    props.close();
  };

  return (
    <TimePickerDialog
      initialDate={props.current.toISOString()}
      onDismissRequest={props.close}
      onDateSelected={choose}
    />
  );
}

// Material's date dialog works in UTC days; Argo's values are local.
const utcDay = (date: Date): string =>
  new Date(
    Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()),
  ).toISOString();

const localDay = (picked: Date): Date =>
  new Date(picked.getUTCFullYear(), picked.getUTCMonth(), picked.getUTCDate());

function withTime(day: Date, time: Date): Date {
  const date = new Date(day);

  date.setHours(time.getHours(), time.getMinutes(), 0, 0);

  return date;
}
