import { RNHostView } from '@expo/ui/jetpack-compose';
import type * as React from 'react';
import { Pressable, View, type PressableProps } from 'react-native';
import { type MenuProps, menuValueLabel } from './menu-props';
import { menuTriggerElement } from './menu-text-trigger';

export function MenuTrigger<Value extends string>(
  props: MenuProps<Value> & { onOpen: () => void },
): React.JSX.Element {
  return (
    <RNHostView matchContents>
      <Pressable
        {...triggerAccessibility(props)}
        disabled={props.disabled}
        onPress={props.onOpen}
      >
        <HiddenTrigger>{menuTriggerElement(props.trigger)}</HiddenTrigger>
      </Pressable>
    </RNHostView>
  );
}

type TriggerAccessibility = Pick<
  PressableProps,
  | 'accessibilityRole'
  | 'accessibilityLabel'
  | 'accessibilityValue'
  | 'accessibilityState'
>;

function triggerAccessibility<Value extends string>(
  props: MenuProps<Value>,
): TriggerAccessibility {
  return {
    accessibilityRole: 'button',
    accessibilityLabel: props.accessibilityLabel,
    accessibilityValue: triggerValue(props),
    accessibilityState: { disabled: props.disabled },
  };
}

function triggerValue<Value extends string>(
  props: MenuProps<Value>,
): PressableProps['accessibilityValue'] {
  const text = menuValueLabel(props);

  return text === undefined ? undefined : { text };
}

function HiddenTrigger(props: {
  children: React.ReactNode;
}): React.JSX.Element {
  return (
    <View
      pointerEvents="none"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      {props.children}
    </View>
  );
}
