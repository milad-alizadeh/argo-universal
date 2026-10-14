import { RNHostView } from '@expo/ui/jetpack-compose';
import type * as React from 'react';
import { Pressable, View, type PressableProps } from 'react-native';
import type { MenuProps } from './menu-props';

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
        <HiddenTrigger>{props.trigger}</HiddenTrigger>
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
  const selected = props.choices.find((choice) => choice.value === props.value);

  return {
    accessibilityRole: 'button',
    accessibilityLabel: props.accessibilityLabel,
    accessibilityValue: { text: selected?.label ?? props.value },
    accessibilityState: { disabled: props.disabled },
  };
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
