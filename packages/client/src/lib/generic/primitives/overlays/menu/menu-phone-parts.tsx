import type * as React from 'react';
import { View, type ViewProps } from 'react-native';
import {
  type ActionMenuProps,
  type MenuChoiceGroup,
  type MenuProps,
  isActionMenu,
  menuChoiceGroups,
  menuLoadingLabel,
  menuValueLabel,
} from './menu-props';
import { menuTriggerElement } from './menu-text-trigger';

/*
 * What the iOS and Android system menus share: the trigger they open from and the rows they draw.
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

// One row of a system menu, before iOS or Android draws it.
export interface NativeMenuItem {
  id: string;
  title: string;
  // Undefined when the row never carries the check; otherwise whether it carries it now.
  checked?: boolean;
  disabled: boolean;
  // Runs the row; a disabled row does nothing even if the system reports it chosen.
  choose: () => void;
}

// A run of a system menu's rows, set apart from the run before it; iOS heads it with its title.
export interface NativeMenuSection {
  title?: string;
  items: NativeMenuItem[];
}

export function nativeMenuSections<Value extends string>(
  props: MenuProps<Value>,
): NativeMenuSection[] {
  if (props.loading) return [{ items: [loadingItem] }];

  if (isActionMenu(props)) return [{ items: props.actions.map(actionItem) }];

  const groups = menuChoiceGroups(props);

  // A row's id is its value; with several groups, the group's place keeps their values apart.
  const prefix = (index: number): string =>
    groups.length > 1 ? `${index}.` : '';

  return groups.map((group, index) => ({
    title: group.label,
    items: choiceItems(group, prefix(index)),
  }));
}

export function nativeMenuItems<Value extends string>(
  props: MenuProps<Value>,
): NativeMenuItem[] {
  return nativeMenuSections(props).flatMap((section) => section.items);
}

const nothing = (): void => undefined;

// The system menus draw no progress row, so a loading menu holds one disabled item that says so.
const loadingItem: NativeMenuItem = {
  id: 'argo.menu.loading',
  title: menuLoadingLabel,
  disabled: true,
  choose: nothing,
};

// An action that can be the selected one carries the check.
function actionItem(
  action: ActionMenuProps['actions'][number],
): NativeMenuItem {
  return {
    id: action.label,
    title: action.label,
    checked: action.selected,
    disabled: Boolean(action.disabled),
    choose: action.disabled ? nothing : action.onPress,
  };
}

function choiceItems(
  group: MenuChoiceGroup,
  idPrefix: string,
): NativeMenuItem[] {
  return group.options.map((choice) => ({
    id: `${idPrefix}${choice.value}`,
    title: choice.label,
    checked: choice.value === group.value,
    disabled: Boolean(choice.disabled),
    choose: choice.disabled ? nothing : () => group.onValueChange(choice.value),
  }));
}
