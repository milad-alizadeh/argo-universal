import * as MenuPrimitive from '@rn-primitives/dropdown-menu';
import type * as React from 'react';
import { MenuActions } from './menu-actions';
import {
  type KeyboardFocus,
  MenuChoiceContent,
  useKeyboardFocus,
} from './menu-choices';
import { type MenuProps, isActionMenu } from './menu-props';
import { menuTriggerElement } from './menu-text-trigger';

export type { MenuAction, MenuProps } from './menu-props';

type MenuPartProps<Value extends string> = MenuProps<Value> & {
  focus: KeyboardFocus;
};

export function Menu<Value extends string>(
  props: MenuProps<Value>,
): React.JSX.Element {
  const focus = useKeyboardFocus();

  return (
    <MenuPrimitive.Root>
      <MenuTrigger {...props} focus={focus} />
      <MenuPrimitive.Portal>
        <MenuBody {...props} focus={focus} />
      </MenuPrimitive.Portal>
    </MenuPrimitive.Root>
  );
}

function MenuTrigger<Value extends string>(
  props: MenuPartProps<Value>,
): React.JSX.Element {
  return (
    <MenuPrimitive.Trigger
      asChild
      accessibilityLabel={props.accessibilityLabel}
      disabled={props.disabled}
      onKeyDown={() => props.focus.onKeyboardFocusChange(true)}
      onPointerDown={() => props.focus.onKeyboardFocusChange(false)}
    >
      {menuTriggerElement(props.trigger)}
    </MenuPrimitive.Trigger>
  );
}

function MenuBody<Value extends string>({
  focus,
  ...props
}: MenuPartProps<Value>): React.JSX.Element {
  if (isActionMenu(props)) return <MenuActions {...props} />;

  return <MenuChoiceContent {...props} focus={focus} />;
}
