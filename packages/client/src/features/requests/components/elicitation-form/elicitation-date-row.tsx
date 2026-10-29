import type { ElicitationPropertySchema } from '@repo/contracts';
import { FieldGroup } from '@repo/kit/primitives/fields/field-group';
import type { ReactElement } from 'react';
import { instantOf, localDateTime } from './elicitation-dates';
import {
  rowTitle,
  type ElicitationFieldProps,
} from './elicitation-field-props';

type DateMode = 'date' | 'datetime';

const formatModes = { date: 'date', 'date-time': 'datetime' } as const;

const formatMode = (format: string | undefined): DateMode | undefined =>
  format === 'date' || format === 'date-time' ? formatModes[format] : undefined;

const dateMode = (property: ElicitationPropertySchema): DateMode | undefined =>
  property.type === 'string' ? formatMode(property.format) : undefined;

export const isDate = (property: ElicitationPropertySchema): boolean =>
  dateMode(property) !== undefined;

// A date answer is the picker's own text; a date-time one is an instant, shown in local time.
function dateBinding(
  mode: DateMode,
  props: ElicitationFieldProps,
): {
  value: string | undefined;
  onValueChange: (next: string) => void;
} {
  const text = typeof props.value === 'string' ? props.value : undefined;

  return mode === 'date'
    ? { value: text, onValueChange: props.onChange }
    : {
        value: localDateTime(text),
        onValueChange: (next) => props.onChange(instantOf(next)),
      };
}

export function DateRow(props: ElicitationFieldProps): ReactElement {
  const mode = dateMode(props.property) ?? 'date';

  return (
    <FieldGroup.DatePicker
      title={rowTitle(props)}
      mode={mode}
      {...dateBinding(mode, props)}
    />
  );
}
