import type { ComponentProps } from 'react';
import type { Pressable } from 'react-native';
import type { DrawingProps, RowPressProps } from './list-item-press-props';

// The row's state as a screen reader hears it.
export const rowState = (
  props: DrawingProps,
): NonNullable<ComponentProps<typeof Pressable>['accessibilityState']> => ({
  selected: props.selected,
  disabled: props.disabled,
  checked: props.checked,
});

// An option's highlight is its selection; another row's selection is pressed.
export function selectedState(props: DrawingProps): RowPressProps {
  return props.role === 'option'
    ? { 'aria-selected': props.selected }
    : { 'aria-pressed': props.selected };
}
