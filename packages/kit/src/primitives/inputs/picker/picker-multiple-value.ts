import type { MultiplePickerProps } from './picker-props';
import { pickerValue } from './picker-selection';

type Summary = Pick<
  MultiplePickerProps<string>,
  'value' | 'options' | 'placeholder' | 'loading'
>;

// Paper: the placeholder, the one chosen name, or a count; none or one reads as the single Picker does.
export function pickerSummary(props: Summary): string {
  const values = props.value ?? [];

  return (
    counted(values, props.loading) ??
    pickerValue({ ...props, value: values[0] })
  );
}

const counted = (
  values: readonly string[],
  loading?: boolean,
): string | undefined =>
  values.length > 1 && !loading ? `${values.length} selected` : undefined;

// Keeps the options' order and drops values a disabled field or option cannot take.
export function chooseValues<Value extends string>(
  props: MultiplePickerProps<Value>,
  next: readonly string[],
): void {
  if (props.disabled) return;

  const current = props.value ?? [];

  const chosen = props.options
    .filter((option) => keeps(option, next, current))
    .map((option) => option.value);

  props.onValueChange(chosen);
}

function keeps(
  option: MultiplePickerProps<string>['options'][number],
  next: readonly string[],
  current: readonly string[],
): boolean {
  const list = option.disabled ? current : next;

  return list.includes(option.value);
}

// A checked option joins the values; an unchecked one leaves them.
export const toggled = (
  values: readonly string[],
  value: string,
  checked: boolean,
): readonly string[] =>
  checked ? [...values, value] : values.filter((entry) => entry !== value);
