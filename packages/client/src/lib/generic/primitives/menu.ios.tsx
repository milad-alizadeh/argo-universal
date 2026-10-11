import { Menu as SwiftMenu, Picker, RNHostView, Text } from '@expo/ui/swift-ui';
import {
  accessibilityLabel,
  accessibilityValue,
  disabled,
  pickerStyle,
  tag,
} from '@expo/ui/swift-ui/modifiers';
import type * as React from 'react';
import { View } from 'react-native';
import { useNativeTheme } from '#lib/generic/native-theme';
import { Host } from './host';
import type { MenuProps } from './menu-props';
import { optionalTint } from './swift-tint';

export function Menu<Value extends string>(
  props: MenuProps<Value>,
): React.JSX.Element {
  const { tint } = useNativeTheme().colors;
  const selected = props.choices.find((choice) => choice.value === props.value);
  return (
    <Host matchContents>
      <SwiftMenu
        modifiers={[
          accessibilityLabel(props.accessibilityLabel),
          accessibilityValue(selected?.label ?? props.value),
          disabled(Boolean(props.disabled)),
          ...optionalTint(tint),
        ]}
        label={
          <RNHostView matchContents>
            <View
              pointerEvents="none"
              accessibilityElementsHidden
              importantForAccessibility="no-hide-descendants"
            >
              {props.trigger}
            </View>
          </RNHostView>
        }
      >
        <Picker
          selection={props.value}
          onSelectionChange={props.onValueChange}
          modifiers={[pickerStyle('inline')]}
        >
          {props.choices.map((choice) => (
            <Text key={choice.value} modifiers={[tag(choice.value)]}>
              {choice.label}
            </Text>
          ))}
        </Picker>
      </SwiftMenu>
    </Host>
  );
}
