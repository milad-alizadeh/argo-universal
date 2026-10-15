import { Button, Menu, Toggle } from '@expo/ui/swift-ui';
import {
  type ModifierConfig,
  accessibilityHint,
  buttonStyle,
  disabled,
  menuStyle,
} from '@expo/ui/swift-ui/modifiers';
import type * as React from 'react';
import { Host } from '#primitives/native/host';
import type { NativeMenuItem } from '#primitives/overlays/menu';
import { type NativeSplit, nativeSplit } from './split-button-items';
import type { SplitButtonProps } from './split-button-props';

export type {
  SplitButtonOption,
  SplitButtonProps,
  SplitMenuProps,
} from './split-button-props';

// A stock SwiftUI Menu with a primary action: a tap runs the button, a long press opens the menu. MenuView, the kit Menu's iOS drawing, has no primary action.
export function SplitButton<Value extends string>(
  props: SplitButtonProps<Value>,
): React.JSX.Element {
  return (
    <Host matchContents>
      <SplitMenu {...nativeSplit(props)} />
    </Host>
  );
}

function SplitMenu(split: NativeSplit): React.JSX.Element {
  return (
    <Menu
      label={split.acting.label}
      onPrimaryAction={split.acting.onPress}
      modifiers={splitModifiers(split)}
    >
      {split.items.map((item) => (
        <MenuItem key={item.id} {...item} />
      ))}
    </Menu>
  );
}

// The stock button styles, prominent beside a primary action and bordered otherwise; the Host's seed colour tints them.
function splitModifiers(split: NativeSplit): ModifierConfig[] {
  return [
    menuStyle('button'),
    buttonStyle(split.primary ? 'borderedProminent' : 'bordered'),
    accessibilityHint(split.menuLabel),
    disabled(!split.enabled),
  ];
}

// A choice draws as a menu toggle, so the system checkmark marks the chosen one; an action is a plain button.
function MenuItem(item: NativeMenuItem): React.JSX.Element {
  const modifiers = [disabled(item.disabled)];

  if (item.checked === undefined)
    return (
      <Button label={item.title} onPress={item.choose} modifiers={modifiers} />
    );

  return (
    <Toggle
      label={item.title}
      isOn={item.checked}
      onIsOnChange={item.choose}
      modifiers={modifiers}
    />
  );
}
