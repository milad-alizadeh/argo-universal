import { errorMessage } from '#primitives/fields/field-errors';
import type { DatePickerProps } from './date-picker-props';

export function isInvalid(
  props: Pick<DatePickerProps, 'invalid' | 'errors'>,
): boolean {
  return !!props.invalid || errorMessage(props.errors ?? []) !== undefined;
}
