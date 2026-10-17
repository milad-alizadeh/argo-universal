import * as RadixMenu from '@radix-ui/react-dropdown-menu';
import type * as React from 'react';
import { View } from 'react-native';
import type { KeyboardFocus } from './menu-choices';
import type { MenuAction } from './menu-props';
import {
  choiceItemClassName,
  focusTracking,
  RadioLabel,
} from './menu-radio-item';
import { menuGroupSpaceClassName } from './menu-styles';

type MenuChoiceActionProps = { action: MenuAction; focus: KeyboardFocus };

// A grouped choice menu's actions on the web: rows shaped as its choices, after the space that sets each group apart.
export function MenuChoiceActions(props: {
  actions: readonly MenuAction[];
  focus: KeyboardFocus;
}): React.JSX.Element | null {
  if (props.actions.length === 0) return null;

  const rows = props.actions.map((action) => (
    <MenuChoiceAction key={action.label} action={action} focus={props.focus} />
  ));

  return (
    <>
      <View className={menuGroupSpaceClassName} />
      {rows}
    </>
  );
}

// Radix's Item runs the action and closes the menu; a disabled one is skipped by the keyboard and not chosen.
function itemProps({
  action,
  focus,
}: MenuChoiceActionProps): RadixMenu.DropdownMenuItemProps {
  return {
    disabled: action.disabled,
    textValue: action.label,
    onSelect: action.onPress,
    ...focusTracking(focus),
  };
}

function MenuChoiceAction(props: MenuChoiceActionProps): React.JSX.Element {
  return (
    <RadixMenu.Item asChild {...itemProps(props)}>
      <View className={choiceItemClassName(props.focus.keyboardFocus)}>
        <RadioLabel label={props.action.label} />
      </View>
    </RadixMenu.Item>
  );
}
