import {
  type ActionMenuProps,
  type ChoiceMenuProps,
  type MenuProps,
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
}

// What a menu lists: its options with the chosen value, or its actions, and whether they are still loading.
export type MenuRows<Value extends string = string> = (
  | ChoiceRows<Value>
  | Pick<ActionMenuProps, 'actions'>
) &
  Pick<MenuProps<Value>, 'loading'>;

type ChoiceRows<Value extends string> = Pick<
  ChoiceMenuProps<Value>,
  'options' | 'value' | 'onValueChange' | 'actions'
>;

const listsActions = <Value extends string>(
  rows: MenuRows<Value>,
): rows is Pick<ActionMenuProps, 'actions'> => rows.actions !== undefined;

export function nativeMenuItems<Value extends string>(
  rows: MenuRows<Value>,
): NativeMenuItem[] {
  if (rows.loading) return [loadingItem];

  if (listsActions(rows)) return rows.actions.map(actionItem);

  return choiceItems(rows);
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

function choiceItems<Value extends string>(
  props: ChoiceRows<Value>,
): NativeMenuItem[] {
  return props.options.map((choice) => ({
    id: choice.value,
    title: choice.label,
    checked: choice.value === props.value,
    disabled: Boolean(choice.disabled),
    choose: choice.disabled ? nothing : () => props.onValueChange(choice.value),
  }));
}
