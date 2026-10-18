import { createElement, type ReactElement } from 'react';
import { Pressable, View } from 'react-native';
import { Icon } from '#primitives/content/icon';
import { Text } from '#primitives/content/text';
import type { FieldDescription } from '#primitives/fields/field-description';
import { cn } from '../../../utils';
import type { ComboboxProps } from './combobox-props';
import { comboboxValue } from './combobox-value';

// Radix's Trigger hands its child the anchor ref and popup state; dropping the ref leaves the popover unplaced.
type Anchor = Pick<
  React.ComponentProps<typeof Pressable>,
  'ref' | 'aria-expanded'
> & {
  'aria-haspopup'?: 'dialog';
  'aria-controls'?: string;
};

type Props<Value extends string> = ComboboxProps<Value> &
  FieldDescription &
  Anchor & { onPress?: () => void };

export function ComboboxTrigger<Value extends string>(
  props: Props<Value>,
): ReactElement {
  return createElement(
    Pressable,
    triggerProps(props),
    <View className="min-w-0 flex-1">
      <Text>{comboboxValue(props)}</Text>
    </View>,
    <Icon name="chevron-up-down" role="control" aria-hidden />,
  );
}

type Attributes = React.ComponentProps<typeof Pressable> &
  Anchor & {
    'aria-describedby'?: string;
  };

function triggerProps<Value extends string>(props: Props<Value>): Attributes {
  return {
    ref: props.ref,
    'aria-haspopup': props['aria-haspopup'],
    'aria-expanded': props['aria-expanded'],
    'aria-controls': props['aria-controls'],
    role: 'button',
    accessibilityLabel: props.label,
    disabled: props.disabled,
    onPress: props.onPress,
    'aria-describedby': props.descriptionId,
    className: triggerClass(props),
  };
}

function triggerClass(
  props: Pick<FieldDescription, 'invalid'> & { disabled?: boolean },
): string {
  return cn(
    'min-h-10 flex-row items-center gap-3 rounded-control border border-border bg-card px-3 py-2 web:focus-visible:ring-2 web:focus-visible:ring-focus',
    props.invalid && 'border-danger',
    props.disabled && 'opacity-50',
  );
}
