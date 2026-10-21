import type { PickerOption, SinglePickerProps } from './picker-props';

export function pickerOption<Value extends string>(
  props: Pick<SinglePickerProps<Value>, 'options' | 'value'>,
): PickerOption<Value> | undefined {
  return props.options.find((option) => option.value === props.value);
}

export function choosePickerOption<Value extends string>(
  props: SinglePickerProps<Value>,
  next?: string,
): void {
  if (props.disabled) return;
  const option = props.options.find((item) => item.value === next);

  if (option) commitChoice(props, option);
}

function commitChoice<Value extends string>(
  props: SinglePickerProps<Value>,
  option: PickerOption<Value>,
): void {
  if (option.disabled) return;
  props.onValueChange(option.value);
}

export function pickerValue<Value extends string>(
  props: Pick<
    SinglePickerProps<Value>,
    'loading' | 'options' | 'value' | 'placeholder'
  >,
): string {
  if (props.loading) return 'Loading…';
  const option = pickerOption(props);

  return option ? option.label : unchosenValue(props);
}

function unchosenValue(
  props: Pick<SinglePickerProps<string>, 'value' | 'placeholder'>,
): string {
  if (props.value !== undefined) return `${props.value} (unavailable)`;

  return props.placeholder ?? 'Choose…';
}

export function pickerOptionsMessage(
  props: Pick<SinglePickerProps<string>, 'loading' | 'loadError' | 'options'>,
): string | undefined {
  if (props.loading) return 'Loading options…';

  return props.loadError ?? emptyMessage(props.options.length);
}

function emptyMessage(optionCount: number): string | undefined {
  return optionCount === 0 ? 'No options available' : undefined;
}
