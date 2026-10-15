import type { ReactElement, ReactNode } from 'react';

// One action in a menu: choosing it runs it and closes the menu.
export interface MenuAction {
  label: string;
  onPress: () => void;
  // The action the trigger shows now, such as the PR a header lists: every menu marks it with a check.
  selected?: boolean;
  // Drawn in place of the label where the menu draws its own rows (web); the label still names the action on native menus.
  content?: ReactNode;
  // Shown but not chosen, such as an action the current state does not allow.
  disabled?: boolean;
}

// One answer in a choice menu; a disabled one is shown but cannot be chosen.
export interface MenuOption<Value extends string> {
  value: Value;
  label: string;
  disabled?: boolean;
}

interface MenuBaseProps {
  accessibilityLabel: string;
  // The element the menu opens from, or text the menu draws as its inline trigger: a muted label and a down chevron.
  trigger: ReactElement | string;
  disabled?: boolean;
  // Which edge of the trigger the web menu lines up with; native menus place themselves.
  align?: 'start' | 'end';
  // The options are on their way: the menu opens to one progress row with nothing to choose.
  loading?: boolean;
}

// What the progress row says while a menu's options load.
export const menuLoadingLabel = 'Loading options…';

// A single-choice menu: the chosen value carries a check.
export interface ChoiceMenuProps<Value extends string> extends MenuBaseProps {
  value: Value;
  options: readonly MenuOption<Value>[];
  onValueChange: (value: Value) => void;
  actions?: never;
}

// An action menu: each item runs its own action.
export interface ActionMenuProps extends MenuBaseProps {
  actions: readonly MenuAction[];
  value?: never;
  options?: never;
  onValueChange?: never;
}

export type MenuProps<Value extends string = string> =
  | ChoiceMenuProps<Value>
  | ActionMenuProps;

export function isActionMenu<Value extends string>(
  props: MenuProps<Value>,
): props is ActionMenuProps {
  return props.actions !== undefined;
}

// What a native trigger reads out as its value: the chosen label; an action menu has none.
export function menuValueLabel<Value extends string>(
  props: MenuProps<Value>,
): string | undefined {
  return isActionMenu(props) ? undefined : chosenLabel(props);
}

function chosenLabel<Value extends string>(
  props: ChoiceMenuProps<Value>,
): string {
  const chosen = props.options.find((choice) => choice.value === props.value);

  return chosen?.label ?? props.value;
}
