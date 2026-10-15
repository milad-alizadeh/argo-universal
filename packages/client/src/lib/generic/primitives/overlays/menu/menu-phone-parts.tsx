import type * as React from 'react';
import { View, type ViewProps } from 'react-native';
import { type MenuProps, menuValueLabel } from './menu-props';
import { menuTriggerElement } from './menu-text-trigger';

/*
 * The trigger the iOS and Android system menus open from; their rows come from menu-native-items.
 * The trigger names the menu; the menu itself takes the press, so the element inside draws only.
 */
export function NativeMenuTrigger<Value extends string>(
  props: MenuProps<Value>,
): React.JSX.Element {
  return (
    <View accessible {...triggerAccessibility(props)} pointerEvents="none">
      {menuTriggerElement(props.trigger)}
    </View>
  );
}

type TriggerAccessibility = Pick<
  ViewProps,
  | 'accessibilityRole'
  | 'accessibilityLabel'
  | 'accessibilityValue'
  | 'accessibilityState'
>;

function triggerAccessibility<Value extends string>(
  props: MenuProps<Value>,
): TriggerAccessibility {
  const text = menuValueLabel(props);

  return {
    accessibilityRole: 'button',
    accessibilityLabel: props.accessibilityLabel,
    accessibilityValue: text === undefined ? undefined : { text },
    accessibilityState: {
      disabled: Boolean(props.disabled),
      busy: Boolean(props.loading),
    },
  };
}
