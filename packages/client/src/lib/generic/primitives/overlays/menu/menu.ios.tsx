import {
  Button,
  Menu as SwiftMenu,
  RNHostView,
  Toggle,
} from '@expo/ui/swift-ui';
import {
  type ModifierConfig,
  accessibilityLabel,
  accessibilityValue,
  disabled,
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
  menuLoadingLabel,
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

  return <MenuChoices {...props} />;
}

function useMenuModifiers<Value extends string>(
  props: MenuProps<Value>,
): ModifierConfig[] {
  const { accent } = useNativeTheme().colors;

  return [
    accessibilityLabel(props.accessibilityLabel),
    ...menuValue(props),
    disabled(Boolean(props.disabled || props.loading)),
    ...optionalTint(accent),
  ];
}

// UIMenu draws no progress row, so a loading menu stays shut and its trigger says what it waits for.
function menuValue<Value extends string>(
  props: MenuProps<Value>,
): ModifierConfig[] {
  const value = props.loading ? menuLoadingLabel : menuValueLabel(props);

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
  const modifiers = [disabled(!!action.disabled)];

  if (action.selected !== undefined)
    return <MenuToggle {...action} selected={action.selected} />;

  return (
    <Button
      label={action.label}
      onPress={action.onPress}
      modifiers={modifiers}
    />
  );
}

function MenuToggle(
  action: MenuAction & { selected: boolean },
): React.JSX.Element {
  return (
    <Toggle
      label={action.label}
      isOn={action.selected}
      onIsOnChange={action.onPress}
      modifiers={[disabled(!!action.disabled)]}
    />
  );
}

// Each option is a menu toggle with the system checkmark: an inline Picker ignores .disabled on its rows.
function MenuChoices<Value extends string>(
  props: ChoiceMenuProps<Value>,
): React.JSX.Element {
  return <>{props.options.map((choice) => choiceToggle(props, choice))}</>;
}

function choiceToggle<Value extends string>(
  props: ChoiceMenuProps<Value>,
  choice: ChoiceMenuProps<Value>['options'][number],
): React.JSX.Element {
  return (
    <MenuToggle
      key={choice.value}
      label={choice.label}
      disabled={choice.disabled}
      selected={choice.value === props.value}
      onPress={() => props.onValueChange(choice.value)}
    />
  );
}

Menu satisfies React.ComponentType<MenuProps<string>>;
