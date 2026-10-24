import type { ReactElement } from 'react';
import { inlineOptionRows } from './field-picker-inline-rows';
import type { FieldPickerProps } from './field-picker-model';

// An `inline` choice is a row per option, each toggling its own value; the chosen ones end in a check.
export function InlineChecks(props: FieldPickerProps): ReactElement {
  return <>{inlineOptionRows(props)}</>;
}
