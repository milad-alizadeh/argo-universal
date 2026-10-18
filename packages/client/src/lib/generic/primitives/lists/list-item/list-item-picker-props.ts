import type { KitProps } from '../../kit-props';

export type ListItemPickerProps<Value extends string = string> = KitProps<
  'ListItem.Picker',
  Value
>;

export function pickerRowValue(props: ListItemPickerProps): string {
  if (props.loading) return 'Loading…';

  const option = props.options.find((item) => item.value === props.value);

  return option ? option.label : pickerPlaceholder(props);
}

function pickerPlaceholder(props: ListItemPickerProps): string {
  return props.placeholder ?? 'Choose…';
}
