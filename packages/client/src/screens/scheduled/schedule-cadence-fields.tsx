import { FieldGroup } from '@repo/kit/primitives/fields/field-group';
import type { ReactElement } from 'react';
import type { ScheduleCadenceDraft } from './schedule-cadence-draft';
import { weekdayChoices } from './schedule-time';

export type ScheduleCadenceFields = {
  draft: ScheduleCadenceDraft;
  onChange: (draft: ScheduleCadenceDraft) => void;
  nextRun?: string;
  previewError?: string;
};

type SetCadence = (patch: Partial<ScheduleCadenceDraft>) => void;

const repeats = [
  { value: 'interval', label: 'Interval' },
  { value: 'daily', label: 'Daily' },
  { value: 'weekdays', label: 'Weekdays' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'custom', label: 'Custom' },
] as const;

const intervalUnits = [
  { value: 'second', label: 'Seconds' },
  { value: 'minute', label: 'Minutes' },
  { value: 'hour', label: 'Hours' },
] as const;

const calendarUnits = [
  { value: 'day', label: 'Days' },
  { value: 'week', label: 'Weeks' },
] as const;

function choose<T extends string>(
  choices: readonly { value: T }[],
  current: T,
  next: string,
): T {
  return choices.find(({ value }) => value === next)?.value ?? current;
}

function intervalRows(
  draft: ScheduleCadenceDraft,
  set: SetCadence,
): ReactElement {
  return (
    <>
      <FieldGroup.TextField
        title="Every"
        value={draft.interval}
        keyboardType="decimal-pad"
        onChangeText={(interval) => set({ interval })}
      />
      <FieldGroup.Picker
        title="Unit"
        presentation="menu"
        value={draft.intervalUnit}
        options={intervalUnits}
        onValueChange={(value) =>
          set({
            intervalUnit: choose(intervalUnits, draft.intervalUnit, value),
          })
        }
      />
    </>
  );
}

function customRows(
  draft: ScheduleCadenceDraft,
  set: SetCadence,
): ReactElement {
  return (
    <>
      <FieldGroup.TextField
        title="Every"
        value={draft.every}
        keyboardType="number-pad"
        onChangeText={(every) => set({ every })}
      />
      <FieldGroup.Picker
        title="Unit"
        presentation="menu"
        value={draft.unit}
        options={calendarUnits}
        onValueChange={(value) =>
          set({ unit: choose(calendarUnits, draft.unit, value) })
        }
      />
    </>
  );
}

function weekdayRow(
  draft: ScheduleCadenceDraft,
  set: SetCadence,
): ReactElement {
  return (
    <FieldGroup.Picker
      title="On days"
      presentation="menu"
      multiple
      value={draft.weekdays}
      options={weekdayChoices}
      onValueChange={(values) =>
        set({
          weekdays: weekdayChoices
            .filter(({ value }) => values.includes(value))
            .map(({ value }) => value),
        })
      }
    />
  );
}

const zones =
  typeof Intl.supportedValuesOf === 'function'
    ? Intl.supportedValuesOf('timeZone')
    : null;

function timeZoneRow(
  draft: ScheduleCadenceDraft,
  set: SetCadence,
): ReactElement {
  if (!zones) {
    return (
      <FieldGroup.TextField
        title="Time zone"
        value={draft.timeZone}
        onChangeText={(timeZone) => set({ timeZone })}
      />
    );
  }

  const values = [...new Set(['UTC', draft.timeZone, ...zones])];

  return (
    <FieldGroup.Picker
      title="Time zone"
      presentation="page"
      searchable
      value={draft.timeZone}
      options={values.map((value) => ({ value, label: value }))}
      onValueChange={(timeZone) => set({ timeZone })}
    />
  );
}

function calendarRows(
  draft: ScheduleCadenceDraft,
  set: SetCadence,
): ReactElement {
  const needsDays =
    draft.repeat === 'weekly' ||
    (draft.repeat === 'custom' && draft.unit === 'week');

  return (
    <>
      {draft.repeat === 'custom' && customRows(draft, set)}
      {needsDays && weekdayRow(draft, set)}
      <FieldGroup.DatePicker
        title="Start time"
        mode="time"
        value={draft.localTime}
        onValueChange={(localTime) => set({ localTime })}
      />
      {timeZoneRow(draft, set)}
    </>
  );
}

// Return the Section so DialogForm can find the Kit rows in both the dialog and the sheet.
export function scheduleSection({
  draft,
  onChange,
  nextRun,
  previewError,
}: ScheduleCadenceFields): ReactElement {
  const set: SetCadence = (patch) => onChange({ ...draft, ...patch });
  const footer = nextRun ? `Next run · ${nextRun}` : previewError;

  return (
    <FieldGroup.Section title="Schedule" footer={footer}>
      <FieldGroup.Picker
        title="Repeat"
        presentation="menu"
        value={draft.repeat}
        options={repeats}
        onValueChange={(value) =>
          set({ repeat: choose(repeats, draft.repeat, value) })
        }
      />
      {draft.repeat === 'interval'
        ? intervalRows(draft, set)
        : calendarRows(draft, set)}
    </FieldGroup.Section>
  );
}
