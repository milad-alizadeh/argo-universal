import type { ReactNode } from 'react';
import type { KitProps } from '../../kit-props';

// Kit-only: a leading icon, as a settings row's.
export type ListItemPickerProps<Value extends string = string> = KitProps<
  'ListItem.Picker',
  Value
> & { leading?: ReactNode };

export function pickerRowValue<Value extends string>(
  props: ListItemPickerProps<Value>,
): string {
  if (props.loading) return 'Loading…';

  const option = props.options.find((item) => item.value === props.value);

  return option ? option.label : pickerPlaceholder(props);
}

function pickerPlaceholder(props: { placeholder?: string }): string {
  return props.placeholder ?? 'Choose…';
}
