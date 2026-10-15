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
  menuLoadingLabel,
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
    accessibilityState: {
      disabled: Boolean(props.disabled),
      busy: Boolean(props.loading),
    },
  };
}

function menuActions<Value extends string>(
  props: MenuProps<Value>,
): NativeMenuAction[] {
  if (props.loading) return [loadingItem];

  if (isActionMenu(props)) return props.actions.map(actionItem);

  return choiceItems(props);
}

// The system menus draw no progress row, so a loading menu holds one disabled item that says so.
const loadingId = 'argo.menu.loading';

const loadingItem: NativeMenuAction = {
  id: loadingId,
  title: menuLoadingLabel,
  attributes: { disabled: true },
};

// MenuAction.attributes.disabled: the system greys the item and does not run it.
const disabledAttributes = (
  disabled: boolean | undefined,
): Pick<NativeMenuAction, 'attributes'> =>
  disabled ? { attributes: { disabled: true } } : {};

// An action that can be the selected one carries the system check.
function actionItem(
  action: ActionMenuProps['actions'][number],
): NativeMenuAction {
  const item = {
    id: action.label,
    title: action.label,
    ...disabledAttributes(action.disabled),
  };

  if (action.selected === undefined) return item;

  return { ...item, state: action.selected ? 'on' : 'off' };
}

function choiceItems<Value extends string>(
  props: ChoiceMenuProps<Value>,
): NativeMenuAction[] {
  return props.options.map((choice) => ({
    id: choice.value,
    title: choice.label,
    state: choice.value === props.value ? 'on' : 'off',
    ...disabledAttributes(choice.disabled),
  }));
}

function runAction<Value extends string>(
  props: MenuProps<Value>,
  event: NativeActionEvent,
): void {
  const id = event.nativeEvent.event;

  if (props.loading) return;

  if (isActionMenu(props)) runChosenAction(props, id);
  else chooseValue(props, id);
}

function runChosenAction(props: ActionMenuProps, id: string): void {
  const action = props.actions.find((candidate) => candidate.label === id);

  if (action && !action.disabled) action.onPress();
}

function chooseValue<Value extends string>(
  props: ChoiceMenuProps<Value>,
  id: string,
): void {
  const choice = props.options.find((option) => option.value === id);

  if (choice !== undefined && !choice.disabled)
    props.onValueChange(choice.value);
}

Menu satisfies React.ComponentType<MenuProps<string>>;
