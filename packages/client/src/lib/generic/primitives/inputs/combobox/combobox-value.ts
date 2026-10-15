import type { ComboboxProps } from './combobox-props';

export type ChoiceValue = Pick<
  ComboboxProps<string>,
  'value' | 'options' | 'placeholder' | 'loading'
>;

export function comboboxValue(props: ChoiceValue): string {
  if (props.loading) return 'Loading…';

  const option = props.options.find((entry) => entry.value === props.value);

  return selectedLabel(option, props);
}

function unavailableValue(props: ChoiceValue): string {
  if (props.value !== undefined) return `${props.value} (unavailable)`;

  return props.placeholder ?? 'Choose…';
}

function selectedLabel(
  option: ChoiceValue['options'][number] | undefined,
  props: ChoiceValue,
): string {
  return option?.label ?? unavailableValue(props);
}
