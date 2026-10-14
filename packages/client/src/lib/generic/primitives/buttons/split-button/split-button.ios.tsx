import { Button, Menu, Toggle } from '@expo/ui/swift-ui';
import {
  type ModifierConfig,
  accessibilityHint,
  buttonStyle,
  disabled,
  menuStyle,
} from '@expo/ui/swift-ui/modifiers';
import type * as React from 'react';
import { useNativeTheme } from '#lib/generic/native-theme';
import { Host } from '#primitives/native/host';
import { optionalTint } from '#primitives/native/native-modifiers';
import {
  type NativeSplit,
  type SplitMenuItem,
  nativeSplit,
} from './split-button-items';
import type { SplitButtonProps } from './split-button-props';

export type {
  SplitButtonOption,
  SplitButtonProps,
  SplitMenuProps,
} from './split-button-props';

// A stock SwiftUI Menu with a primary action: a tap runs the button, a long press opens the menu.
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
  const modifiers = useSplitModifiers(split);

  return (
    <Menu
      label={split.acting.label}
      onPrimaryAction={split.acting.onPress}
      modifiers={modifiers}
    >
      {split.items.map((item) => (
        <MenuItem key={item.label} {...item} />
      ))}
    </Menu>
  );
}

// The stock button styles: prominent, in the accent, beside a primary action; bordered otherwise.
function useSplitModifiers(split: NativeSplit): ModifierConfig[] {
  const { accent } = useNativeTheme().colors;
  const tint = split.primary ? optionalTint(accent) : [];

  return [
    menuStyle('button'),
    buttonStyle(split.primary ? 'borderedProminent' : 'bordered'),
    accessibilityHint(split.menuLabel),
    disabled(!split.enabled),
    ...tint,
  ];
}

// A choice draws as a menu toggle, so the system checkmark marks the chosen one; an action is a plain button.
function MenuItem(item: SplitMenuItem): React.JSX.Element {
  if (item.selected === undefined)
    return <Button label={item.label} onPress={item.onPress} />;

  return (
    <Toggle
      label={item.label}
      isOn={item.selected}
      onIsOnChange={item.onPress}
    />
  );
}
