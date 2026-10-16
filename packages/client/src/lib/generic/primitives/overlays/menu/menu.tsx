import * as RadixMenu from '@radix-ui/react-dropdown-menu';
import type * as React from 'react';
import { View } from 'react-native';
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

/*
 * The web's menu, on Radix Dropdown Menu (`@radix-ui/react-dropdown-menu`): Root, Trigger `asChild`/`disabled`,
 * Portal, Content `align`/`loop`, Item `onSelect`, RadioGroup `value`/`onValueChange`, RadioItem `value`/
 * `textValue` and ItemIndicator. Rows are plain views, so Radix's own click and Enter/Space select them once.
 */
export function Menu<Value extends string>(
  props: MenuProps<Value>,
): React.JSX.Element {
  const focus = useKeyboardFocus();

  return (
    <RadixMenu.Root>
      <View>
        <MenuTrigger {...props} focus={focus} />
        <RadixMenu.Portal>
          <MenuBody {...props} focus={focus} />
        </RadixMenu.Portal>
      </View>
    </RadixMenu.Root>
  );
}

function MenuTrigger<Value extends string>(
  props: MenuPartProps<Value>,
): React.JSX.Element {
  return (
    <RadixMenu.Trigger
      asChild
      aria-label={props.accessibilityLabel}
      disabled={props.disabled}
      onKeyDown={() => props.focus.onKeyboardFocusChange(true)}
      onPointerDown={() => props.focus.onKeyboardFocusChange(false)}
    >
      {menuTriggerElement(props.trigger)}
    </RadixMenu.Trigger>
  );
}

function MenuBody<Value extends string>({
  focus,
  ...props
}: MenuPartProps<Value>): React.JSX.Element {
  if (isActionMenu(props)) return <MenuActions {...props} focus={focus} />;

  return <MenuChoiceContent {...props} focus={focus} />;
}

Menu satisfies React.ComponentType<MenuProps<string>>;
