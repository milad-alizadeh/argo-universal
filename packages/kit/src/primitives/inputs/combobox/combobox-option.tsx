import type { ReactElement } from 'react';
import { Platform } from 'react-native';
import { Icon } from '#primitives/content/icon';
import { ListItem } from '#primitives/lists/list-item';
import type { ComboboxContentProps, ComboboxOption } from './combobox-props';

export type OptionProps<Value extends string> = ComboboxContentProps<Value> & {
  option: ComboboxOption<Value>;
};

export function ComboboxOptionRow<Value extends string>(
  props: OptionProps<Value>,
): ReactElement {
  return <ListItem {...rowProps(props)} />;
}

function rowProps<Value extends string>({
  option,
  disabled,
}: OptionProps<Value>): React.ComponentProps<typeof ListItem> {
  return {
    ...optionContent(option),
    disabled: option.disabled || disabled,
    accessibilityRole: Platform.OS === 'web' ? 'radio' : 'button',
  };
}

function optionContent(
  option: ComboboxOption<string>,
): React.ComponentProps<typeof ListItem> {
  return {
    id: option.value,
    title: option.label,
    subtitle: option.subtitle,
    leading: option.icon ? <Icon name={option.icon} role="row" /> : undefined,
    accessibilityLabel: option.accessibilityLabel ?? option.label,
  };
}
