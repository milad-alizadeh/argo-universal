import { Menu as SwiftMenu, Picker, RNHostView, Text } from '@expo/ui/swift-ui';
import {
  type ModifierConfig,
  accessibilityLabel,
  accessibilityValue,
  disabled,
  pickerStyle,
  tag,
} from '@expo/ui/swift-ui/modifiers';
import type * as React from 'react';
import { View } from 'react-native';
import { useNativeTheme } from '#lib/generic/native-theme';
import { Host } from '../../native/host';
import { optionalTint } from '../../native/swift-tint';
import type { MenuProps } from './menu-props';

export function Menu<Value extends string>(
  props: MenuProps<Value>,
): React.JSX.Element {
  const modifiers = useMenuModifiers(props);

  return (
    <Host matchContents>
      <SwiftMenu
        modifiers={modifiers}
        label={<MenuLabel>{props.trigger}</MenuLabel>}
      >
        <MenuPicker {...props} />
      </SwiftMenu>
    </Host>
  );
}

function useMenuModifiers<Value extends string>(
  props: MenuProps<Value>,
): ModifierConfig[] {
  const { tint } = useNativeTheme().colors;
  const selected = props.choices.find((choice) => choice.value === props.value);

  return [
    accessibilityLabel(props.accessibilityLabel),
    accessibilityValue(selected?.label ?? props.value),
    disabled(Boolean(props.disabled)),
    ...optionalTint(tint),
  ];
}

function MenuLabel(props: { children: React.ReactNode }): React.JSX.Element {
  return (
    <RNHostView matchContents>
      <View
        pointerEvents="none"
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
      >
        {props.children}
      </View>
    </RNHostView>
  );
}

function MenuPicker<Value extends string>(
  props: MenuProps<Value>,
): React.JSX.Element {
  return (
    <Picker
      selection={props.value}
      onSelectionChange={props.onValueChange}
      modifiers={[pickerStyle('inline')]}
    >
      {props.choices.map((choice) => (
        <PickerOption key={choice.value} {...choice} />
      ))}
    </Picker>
  );
}

function PickerOption(props: {
  value: string;
  label: string;
}): React.JSX.Element {
  return <Text modifiers={[tag(props.value)]}>{props.label}</Text>;
}
