import type { IconName } from '../../../symbols/icon-names';
import {
  type ActionMenuProps,
  type MenuChoiceGroup,
  type MenuChoiceRows,
  type MenuProps,
  menuChoiceGroups,
  menuLoadingLabel,
} from './menu-props';

// One row of a system menu, before iOS or Android draws it.
export interface NativeMenuItem {
  id: string;
  title: string;
  // Undefined when the row never carries the check; otherwise whether it carries it now.
  checked?: boolean;
  disabled: boolean;
  // Runs the row; a disabled row does nothing even if the system reports it chosen.
  choose: () => void;
  // True on the first row of a later section: Android's flat list sets it apart with a divider.
  divided?: boolean;
  icon?: IconName;
}

// A run of a system menu's rows, set apart from the run before it; iOS heads it with its title.
export interface NativeMenuSection {
  title?: string;
  items: NativeMenuItem[];
}

// What a menu lists: its options with the chosen value, its groups, or its actions, and whether they are still loading.
export type MenuRows<Value extends string = string> = (
  | (MenuChoiceRows<Value> & { actions?: never })
  | Pick<ActionMenuProps, 'actions'>
) &
  Pick<MenuProps<Value>, 'loading'>;

const listsActions = <Value extends string>(
  rows: MenuRows<Value>,
): rows is Pick<ActionMenuProps, 'actions'> => rows.actions !== undefined;

export function nativeMenuSections<Value extends string>(
  rows: MenuRows<Value>,
): NativeMenuSection[] {
  if (rows.loading) return [{ items: [loadingItem] }];

  if (listsActions(rows)) return [{ items: rows.actions.map(actionItem) }];

  const groups = menuChoiceGroups(rows);

  // A row's id is its value; with several groups, the group's place keeps their values apart.
  const prefix = (index: number): string =>
    groups.length > 1 ? `${index}.` : '';

  return groups.map((group, index) => ({
    title: group.label,
    items: choiceItems(group, prefix(index)),
  }));
}

// The sections' rows in one list, each later section's first row marked as divided.
export function nativeMenuItems<Value extends string>(
  rows: MenuRows<Value>,
): NativeMenuItem[] {
  return nativeMenuSections(rows).flatMap(sectionItems);
}

function sectionItems(
  section: NativeMenuSection,
  index: number,
): NativeMenuItem[] {
  const [first, ...rest] = section.items;

  if (index === 0 || !first) return section.items;

  return [{ ...first, divided: true }, ...rest];
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
    icon: choice.icon,
    choose: choice.disabled ? nothing : () => group.onValueChange(choice.value),
  }));
}
