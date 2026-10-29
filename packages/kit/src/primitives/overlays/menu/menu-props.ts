import type { ReactElement, ReactNode } from 'react';
import type { ActionShortcut } from '#primitives/content/kbd';
import type { IconName } from '../../../symbols/icon-names';
import type { IconSymbol } from '../../../symbols/icon-symbol';
import type { SizeClassValue } from '../../../use-size-class/size-class-value';
import type { KitProps } from '../../kit-props';

type DerivedMenu<Value extends string = string> = KitProps<'Menu', Value>;

type Actions = Extract<DerivedMenu, { actions: readonly unknown[] }>;

// Kit-only: custom web row content.
export type MenuAction = Actions['actions'][number] & {
  id?: string;
  content?: ReactNode;
  section?: { title?: string };
  shortcut?: ActionShortcut;
  tone?: 'danger';
};

// Kit-only: a row that opens a nested menu of its own rows, as a submenu Action does in a header's overflow menu.
export interface MenuSubmenu {
  id?: string;
  label: string;
  // The row's spoken name when it says more than the label, such as the count.
  accessibilityLabel?: string;
  icon?: IconSymbol;
  // A count badge's text, shown after the label.
  count?: string;
  section?: { title?: string };
  actions: readonly MenuEntry[];
}

// A system menu row's title where the row has no place of its own for a count, as iOS menus: the count after the label.
export const countedTitle = (title: string, count?: string): string =>
  count ? `${title} (${count})` : title;

export type MenuEntry = MenuAction | MenuSubmenu;

export function isMenuSubmenu(entry: MenuEntry): entry is MenuSubmenu {
  return 'actions' in entry;
}

export type MenuOption<Value extends string> = Extract<
  DerivedMenu<Value>,
  { options: readonly unknown[] }
>['options'][number];

/*
 * The labelled trigger a Menu, Picker or Composer overlay opens from: a leading icon, the label and a down chevron.
 * Argo draws it on desktop and the web; on phones it is the label of the SwiftUI Menu or the Compose DropdownMenu anchor.
 */
export interface MenuTriggerProps {
  // The current value, which names the trigger.
  label: string;
  detail?: string;
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

// Kit-only: the local interactive trigger, optionally by Size class.
type MenuTrigger = { trigger: SizeClassValue<ReactElement | string> };

export const menuLoadingLabel = 'Loading options…';

export type ChoiceMenuProps<Value extends string> = Extract<
  DerivedMenu<Value>,
  { options: readonly unknown[] }
> &
  MenuTrigger;

export type MenuChoiceGroup = Extract<
  DerivedMenu,
  { groups: readonly unknown[] }
>['groups'][number];

export type GroupedChoiceMenuProps = Extract<
  DerivedMenu,
  { groups: readonly unknown[] }
> &
  MenuTrigger;

export type ActionMenuProps = Omit<Actions, 'actions'> &
  MenuTrigger & { actions: readonly MenuEntry[] };

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
