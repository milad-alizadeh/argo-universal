import { FieldGroup } from '@repo/kit/primitives/fields/field-group';
import { useState, type ReactElement } from 'react';
import { secondsPerHour, secondsPerMinute } from './schedule-time';

const units = [
  { value: 'minutes', label: 'Minutes' },
  { value: 'hours', label: 'Hours' },
];

export type IntervalFields = { intervalSeconds: number; section: ReactElement };

export function useIntervalFields(initial = secondsPerHour): IntervalFields {
  const asHours = initial % secondsPerHour === 0;
  const [count, setCount] = useState(
    String(initial / (asHours ? secondsPerHour : secondsPerMinute)),
  );
  const [unit, setUnit] = useState(asHours ? 'hours' : 'minutes');

  return {
    intervalSeconds:
      Number(count) * (unit === 'hours' ? secondsPerHour : secondsPerMinute),
    section: (
      <FieldGroup.Section title="Schedule">
        <FieldGroup.Value title="Repeat" value="Interval" />
        <FieldGroup.TextField
          title="Every"
          value={count}
          keyboardType="decimal-pad"
          onChangeText={setCount}
        />
        <FieldGroup.Picker
          title="Unit"
          presentation="menu"
          value={unit}
          options={units}
          onValueChange={setUnit}
        />
      </FieldGroup.Section>
    ),
  };
}
