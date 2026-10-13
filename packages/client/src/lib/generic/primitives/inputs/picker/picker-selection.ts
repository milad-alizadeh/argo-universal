import type { PickerOption, PickerProps } from './picker-props';

export function pickerLabel(
  props: Pick<PickerProps<string>, 'label' | 'required'>,
): string {
  return props.required ? `${props.label} *` : props.label;
}

export function pickerOption<Value extends string>(
  props: Pick<PickerProps<Value>, 'options' | 'value'>,
): PickerOption<Value> | undefined {
  return props.options.find((option) => option.value === props.value);
}

export function choosePickerOption<Value extends string>(
  props: PickerProps<Value>,
  next?: string,
): void {
  if (props.disabled) return;
  const option = props.options.find((item) => item.value === next);

  if (option) commitChoice(props, option);
}

function commitChoice<Value extends string>(
  props: PickerProps<Value>,
  option: PickerOption<Value>,
): void {
  if (option.disabled) return;
  props.onChange(option.value);
}

export function pickerValue<Value extends string>(
  props: PickerProps<Value>,
): string {
  if (props.loading) return 'Loading…';
  const option = pickerOption(props);

  return option ? option.label : unchosenValue(props);
}

function unchosenValue(
  props: Pick<PickerProps<string>, 'value' | 'placeholder'>,
): string {
  if (props.value !== undefined) return `${props.value} (unavailable)`;

  return props.placeholder ?? 'Choose…';
}

export function pickerOptionsMessage(
  props: Pick<PickerProps<string>, 'loading' | 'error' | 'options'>,
): string | undefined {
  if (props.loading) return 'Loading options…';

  return props.error ?? emptyMessage(props.options.length);
}

function emptyMessage(optionCount: number): string | undefined {
  return optionCount === 0 ? 'No options available' : undefined;
}
