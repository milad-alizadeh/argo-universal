import type { ElicitationPropertySchema } from '@repo/contracts';
import { FieldGroup } from '@repo/kit/primitives/fields/field-group';
import type { ReactElement } from 'react';
import {
  rowTitle,
  type ElicitationFieldProps,
} from './elicitation-field-props';

const keyboards = { number: 'decimal-pad', integer: 'number-pad' } as const;

const keyboardFor = (
  property: ElicitationPropertySchema,
): 'decimal-pad' | 'number-pad' | undefined =>
  property.type === 'number' || property.type === 'integer'
    ? keyboards[property.type]
    : undefined;

// Text a schema bounds short stays one line; any other grows as it is typed.
const shortText = 100;

const longer = (maxLength: number | undefined): boolean =>
  (maxLength ?? Infinity) > shortText;

const multiline = (property: ElicitationPropertySchema): boolean =>
  property.type === 'string' &&
  property.format === undefined &&
  longer(property.maxLength);

export function TextRow(props: ElicitationFieldProps): ReactElement {
  return (
    <FieldGroup.TextField
      title={rowTitle(props)}
      value={props.value === undefined ? '' : String(props.value)}
      multiline={multiline(props.property)}
      keyboardType={keyboardFor(props.property)}
      error={props.showError ? props.error : undefined}
      onChangeText={props.onChange}
      onBlur={props.onBlur}
    />
  );
}
