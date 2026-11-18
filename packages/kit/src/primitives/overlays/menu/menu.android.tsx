// Stock Compose DropdownMenu: MenuView's Android drawing takes no container colour, so the menu builds the same tree with `color`.
import { TextButton } from '@expo/ui/jetpack-compose';
import { semantics } from '@expo/ui/jetpack-compose/modifiers';
import type * as React from 'react';
import { View } from 'react-native';
import { HostedPress } from '#primitives/native/button-icon';
import { Host } from '#primitives/native/host';
import { MenuDropdown } from './menu-dropdown';
import { nativeMenuItems } from './menu-native-items';
import { NativeMenuTrigger } from './menu-phone-parts';
import type { MenuProps } from './menu-props';
import { useMenuTriggerElement } from './menu-text-trigger';

export function Menu<Value extends string>(
  props: MenuProps<Value>,
): React.JSX.Element {
  if (props.disabled) return <NativeMenuTrigger {...props} />;

  return (
    <Host matchContents>
      <OpenableMenu {...props} />
    </Host>
  );
}

function OpenableMenu<Value extends string>(
  props: MenuProps<Value>,
): React.JSX.Element {
  return (
    <MenuDropdown
      items={nativeMenuItems(props)}
      trigger={(open) => drawTrigger(props, open)}
    />
  );
}

function drawTrigger<Value extends string>(
  props: MenuProps<Value>,
  open: () => void,
): React.JSX.Element {
  if (props.toolbarTitle) return <ToolbarTitleTrigger {...props} open={open} />;

  return (
    <HostedPress onPress={open}>
      <NativeMenuTrigger {...props} />
    </HostedPress>
  );
}

const noPadding = { start: 0, top: 0, end: 0, bottom: 0 };

type ToolbarTriggerProps<Value extends string> = MenuProps<Value> & {
  open: () => void;
};

// The hosted drawing is decorative. The Compose button owns keyboard and TalkBack activation like the Options item.
function ToolbarTitleTrigger<Value extends string>(
  props: ToolbarTriggerProps<Value>,
): React.JSX.Element {
  const drawing = useMenuTriggerElement(props.trigger);
  const label = semantics({ contentDescription: props.accessibilityLabel });

  return (
    <TextButton
      contentPadding={noPadding}
      modifiers={[label]}
      onClick={props.open}
    >
      <HostedPress onPress={props.open}>{decorative(drawing)}</HostedPress>
    </TextButton>
  );
}

const decorative = (drawing: React.JSX.Element): React.JSX.Element => (
  <View importantForAccessibility="no-hide-descendants" pointerEvents="none">
    {drawing}
  </View>
);

Menu satisfies React.ComponentType<MenuProps<string>>;
