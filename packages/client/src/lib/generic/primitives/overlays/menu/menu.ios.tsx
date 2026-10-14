import {
  Button,
  Menu as SwiftMenu,
  Picker,
  RNHostView,
  Text,
  Toggle,
} from '@expo/ui/swift-ui';
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
import { Host } from '#primitives/native/host';
import { optionalTint } from '#primitives/native/native-modifiers';
import {
  type ActionMenuProps,
  type ChoiceMenuProps,
  type MenuAction,
  type MenuProps,
  isActionMenu,
  menuValueLabel,
} from './menu-props';
import { menuTriggerElement } from './menu-text-trigger';

export function Menu<Value extends string>(
  props: MenuProps<Value>,
): React.JSX.Element {
  const modifiers = useMenuModifiers(props);

  return (
    <Host matchContents>
      <SwiftMenu
        modifiers={modifiers}
        label={<MenuLabel>{menuTriggerElement(props.trigger)}</MenuLabel>}
      >
        <MenuItems {...props} />
      </SwiftMenu>
    </Host>
  );
}

function MenuItems<Value extends string>(
  props: MenuProps<Value>,
): React.JSX.Element {
  if (isActionMenu(props)) return <MenuButtons {...props} />;

  return <MenuPicker {...props} />;
}

function useMenuModifiers<Value extends string>(
  props: MenuProps<Value>,
): ModifierConfig[] {
  const { accent } = useNativeTheme().colors;

  return [
    accessibilityLabel(props.accessibilityLabel),
    ...menuValue(props),
    disabled(Boolean(props.disabled)),
    ...optionalTint(accent),
  ];
}

function menuValue<Value extends string>(
  props: MenuProps<Value>,
): ModifierConfig[] {
  const value = menuValueLabel(props);

  return value === undefined ? [] : [accessibilityValue(value)];
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

function MenuButtons(props: ActionMenuProps): React.JSX.Element {
  return (
    <>
      {props.actions.map((action) => (
        <MenuButton key={action.label} {...action} />
      ))}
    </>
  );
}

// An action that can be the selected one draws as a SwiftUI menu toggle: the system checkmark marks it.
function MenuButton(action: MenuAction): React.JSX.Element {
  if (action.selected === undefined)
    return <Button label={action.label} onPress={action.onPress} />;

  return (
    <Toggle
      label={action.label}
      isOn={action.selected}
      onIsOnChange={action.onPress}
    />
  );
}

function MenuPicker<Value extends string>(
  props: ChoiceMenuProps<Value>,
): React.JSX.Element {
  return (
    <Picker
      selection={props.value}
      onSelectionChange={props.onValueChange}
      modifiers={[pickerStyle('inline')]}
    >
      {props.options.map((choice) => (
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

Menu satisfies React.ComponentType<MenuProps<string>>;
