import { MenuView } from '@expo/ui/community/menu';
import type * as React from 'react';
import { useNativeTheme } from '#lib/generic/native-theme';
import { nativeMenuItems, nativeMenuSections } from './menu-native-items';
import { NativeMenuTrigger } from './menu-phone-parts';
import type { MenuProps } from './menu-props';
import { menuAction, runAction, sectionAction } from './menu-view-actions.ios';

// Expo UI's MenuView drop-in, a SwiftUI Menu; Android draws Compose's DropdownMenu instead.
export function Menu<Value extends string>(
  props: MenuProps<Value>,
): React.JSX.Element {
  const { colorScheme } = useNativeTheme();

  if (props.disabled) return <NativeMenuTrigger {...props} />;

  return (
    <MenuView colorScheme={colorScheme} {...menuViewActions(props)}>
      <NativeMenuTrigger {...props} />
    </MenuView>
  );
}

type MenuViewActions = Pick<
  React.ComponentProps<typeof MenuView>,
  'actions' | 'onPressAction'
>;

// MenuView takes the rows as `actions` and reports the chosen one by id through `onPressAction`.
function menuViewActions<Value extends string>(
  props: MenuProps<Value>,
): MenuViewActions {
  const sections = nativeMenuSections(props);
  const items = nativeMenuItems(props);

  return {
    actions:
      sections.length > 1 ? sections.map(sectionAction) : items.map(menuAction),
    onPressAction: (event) => runAction(items, event),
  };
}

Menu satisfies React.ComponentType<MenuProps<string>>;
