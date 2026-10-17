import type { ReactElement, ReactNode } from 'react';
import type { IconName } from '../../../symbols/icon-names';
import type { SizeClassValue } from '../../../use-size-class/size-class-value';

// One action in a menu: choosing it runs it and closes the menu.
export interface MenuAction {
  label: string;
  onPress: () => void;
  // Drawn before the label, as a context menu's rows draw theirs.
  icon?: IconName;
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
  // Drawn before the label; on iOS the system puts it after its own check.
  icon?: IconName;
}

/*
 * The labelled trigger a Menu, Picker or Composer overlay opens from: a leading icon, the label and a down chevron.
 * Argo draws it on desktop and the web; on phones it is the label of the SwiftUI Menu or the Compose DropdownMenu anchor.
 */
export interface MenuTriggerProps {
  // The current value, which names the trigger.
  label: string;
  icon?: IconName;
  // Drawn in the icon's place where no symbol fits, such as an Agent's logo or a progress spinner.
  leading?: ReactElement;
  // Drawn between the label and the chevron, such as a model's effort.
  trailing?: ReactElement;
  // A quiet setting takes `muted`; a risky value, such as full access, `danger`.
  tone?: 'muted' | 'danger';
  // A narrow row, such as the phone Composer's: the label is hidden and read out as the trigger's name, and the chevron goes.
  iconOnly?: boolean;
  disabled?: boolean;
  accessibilityLabel?: string;
  testID?: string;
}

interface MenuBaseProps {
  accessibilityLabel: string;
  /*
   * The element the menu opens from, such as a MenuTrigger, or text the menu draws as its inline trigger: a muted label and a down chevron.
   * One per size class where they differ, such as a phone's header item and a wide window's icon button.
   */
  trigger: SizeClassValue<ReactElement | string>;
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
  groups?: never;
}

// One group of a grouped choice menu: its own single choice, under an optional heading.
export interface MenuChoiceGroup {
  // Heads the group; a group with none sits under the one before it, set apart only by space or a divider.
  label?: string;
  value: string;
  options: readonly MenuOption<string>[];
  onValueChange: (value: string) => void;
}

// Several single choices in one menu, such as what a list shows and how it lays its rows out; each group checks its own value.
export interface GroupedChoiceMenuProps extends MenuBaseProps {
  groups: readonly MenuChoiceGroup[];
  actions?: never;
  value?: never;
  options?: never;
  onValueChange?: never;
}

// An action menu: each item runs its own action.
export interface ActionMenuProps extends MenuBaseProps {
  actions: readonly MenuAction[];
  value?: never;
  options?: never;
  onValueChange?: never;
  groups?: never;
}

export type MenuProps<Value extends string = string> =
  | ChoiceMenuProps<Value>
  | GroupedChoiceMenuProps
  | ActionMenuProps;

// Only an action menu takes `actions`.
export function isActionMenu<Value extends string>(
  props: MenuProps<Value>,
): props is ActionMenuProps {
  return props.actions !== undefined;
}

// What a choice menu's rows come from: its options with the chosen value, or its groups.
export type MenuChoiceRows<Value extends string = string> =
  | Pick<
      ChoiceMenuProps<Value>,
      'value' | 'options' | 'onValueChange' | 'groups'
    >
  | Pick<GroupedChoiceMenuProps, 'groups'>;

function isGroupedMenu<Value extends string>(
  props: MenuChoiceRows<Value>,
): props is Pick<GroupedChoiceMenuProps, 'groups'> {
  return props.groups !== undefined;
}

// A choice menu's groups: a plain choice menu is one group with no heading.
export function menuChoiceGroups<Value extends string>(
  props: MenuChoiceRows<Value>,
): readonly MenuChoiceGroup[] {
  if (isGroupedMenu(props)) return props.groups;

  return [
    {
      value: props.value,
      options: props.options,
      onValueChange: (next) => {
        const chosen = props.options.find((choice) => choice.value === next);

        if (chosen) props.onValueChange(chosen.value);
      },
    },
  ];
}

// What a native trigger reads out as its value: each group's chosen label; an action menu has none.
export function menuValueLabel<Value extends string>(
  props: MenuProps<Value>,
): string | undefined {
  if (isActionMenu(props)) return undefined;

  return menuChoiceGroups(props).map(chosenLabel).join(', ');
}

function chosenLabel(group: MenuChoiceGroup): string {
  const chosen = group.options.find((choice) => choice.value === group.value);

  return chosen?.label ?? group.value;
}
