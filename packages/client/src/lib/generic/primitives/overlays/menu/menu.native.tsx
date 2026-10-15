import {
  type MenuAction as NativeMenuAction,
  MenuView,
  type NativeActionEvent,
} from '@expo/ui/community/menu';
import type * as React from 'react';
import { View, type ViewProps } from 'react-native';
import { useNativeTheme } from '#lib/generic/native-theme';
import {
  type ActionMenuProps,
  type ChoiceMenuProps,
  type MenuProps,
  isActionMenu,
  menuValueLabel,
} from './menu-props';
import { menuTriggerElement } from './menu-text-trigger';

// Expo UI's MenuView drop-in: a SwiftUI Menu on iOS, a Material DropdownMenu on Android.
export function Menu<Value extends string>(
  props: MenuProps<Value>,
): React.JSX.Element {
  const { colorScheme } = useNativeTheme();

  if (props.disabled) return <MenuTrigger {...props} />;

  return (
    <MenuView
      colorScheme={colorScheme}
      actions={menuActions(props)}
      onPressAction={(event) => runAction(props, event)}
    >
      <MenuTrigger {...props} />
    </MenuView>
  );
}

// The trigger names the menu; the menu itself takes the press, so the element inside draws only.
function MenuTrigger<Value extends string>(
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
    accessibilityState: { disabled: Boolean(props.disabled) },
  };
}

function menuActions<Value extends string>(
  props: MenuProps<Value>,
): NativeMenuAction[] {
  if (isActionMenu(props)) return props.actions.map(actionItem);

  return choiceItems(props);
}

// An action that can be the selected one carries the system check.
function actionItem(
  action: ActionMenuProps['actions'][number],
): NativeMenuAction {
  if (action.selected === undefined)
    return { id: action.label, title: action.label };

  return {
    id: action.label,
    title: action.label,
    state: action.selected ? 'on' : 'off',
  };
}

function choiceItems<Value extends string>(
  props: ChoiceMenuProps<Value>,
): NativeMenuAction[] {
  return props.options.map((choice) => ({
    id: choice.value,
    title: choice.label,
    state: choice.value === props.value ? 'on' : 'off',
  }));
}

function runAction<Value extends string>(
  props: MenuProps<Value>,
  event: NativeActionEvent,
): void {
  const id = event.nativeEvent.event;

  if (isActionMenu(props)) runChosenAction(props, id);
  else chooseValue(props, id);
}

function runChosenAction(props: ActionMenuProps, id: string): void {
  props.actions.find((action) => action.label === id)?.onPress();
}

function chooseValue<Value extends string>(
  props: ChoiceMenuProps<Value>,
  id: string,
): void {
  const choice = props.options.find((option) => option.value === id);

  if (choice !== undefined) props.onValueChange(choice.value);
}

Menu satisfies React.ComponentType<MenuProps<string>>;
