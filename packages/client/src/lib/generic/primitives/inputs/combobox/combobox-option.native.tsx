// Choices keep the system checkmark on iOS and Material's radio button on Android.
import { createElement, type ReactElement } from 'react';
import {
  GroupedListItem,
  type GroupedListItemProps,
} from '#primitives/lists/grouped-list-item';
import type { OptionProps } from './combobox-option';
import type { ComboboxOption } from './combobox-props';

export function ComboboxOptionRow<Value extends string>(
  props: OptionProps<Value>,
): ReactElement {
  return createElement(GroupedListItem, {
    ...rowProps(props),
    ...selectionProps(props),
    onPress: () => {
      props.onValueChange(props.option.value);
      props.onClose?.();
    },
  });
}

function selectionProps<Value extends string>(
  props: OptionProps<Value>,
): Pick<GroupedListItemProps, 'selected' | 'choice'> {
  return { selected: props.option.value === props.value, choice: true };
}

function rowProps<Value extends string>({
  option,
  disabled,
}: OptionProps<Value>): GroupedListItemProps {
  return {
    label: option.label,
    icon: option.icon,
    subtitle: supporting(option),
    disabled: option.disabled || disabled,
    disclosure: false,
    accessibilityLabel: option.accessibilityLabel ?? option.label,
    accessibilityRole: 'button',
  };
}

function supporting(
  option: ComboboxOption<string>,
): GroupedListItemProps['subtitle'] {
  return option.supporting
    ? { text: option.supporting, code: option.code }
    : undefined;
}
