import { FieldGroup } from '@repo/kit/primitives/fields/field-group';
import type { ReactElement } from 'react';
import { DateRow, isDate } from './elicitation-date-row';
import {
  rowTitle,
  type ElicitationFieldProps,
} from './elicitation-field-props';
import { TextRow } from './elicitation-text-row';

function ToggleRow(props: ElicitationFieldProps): ReactElement {
  return (
    <FieldGroup.Toggle
      title={rowTitle(props)}
      value={props.value === true}
      onValueChange={props.onChange}
    />
  );
}

type Schema = ElicitationFieldProps['property'];

const rows: [(property: Schema) => boolean, typeof TextRow][] = [
  [(property) => property.type === 'boolean', ToggleRow],
  [isDate, DateRow],
];

/*
 * One schema property as a FieldGroup row: a Toggle for a boolean, a DatePicker for a date
 * format, and a TextField for text or a number.
 */
export function FieldRow(props: ElicitationFieldProps): ReactElement {
  const Row = rows.find(([is]) => is(props.property))?.[1] ?? TextRow;

  return <Row {...props} />;
}
