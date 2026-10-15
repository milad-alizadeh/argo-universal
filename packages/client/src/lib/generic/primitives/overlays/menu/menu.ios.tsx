import {
  type MenuAction as NativeMenuAction,
  MenuView,
  type NativeActionEvent,
} from '@expo/ui/community/menu';
import type * as React from 'react';
import { useNativeTheme } from '#lib/generic/native-theme';
import {
  type NativeMenuItem,
  NativeMenuTrigger,
  nativeMenuItems,
} from './menu-phone-parts';
import type { MenuProps } from './menu-props';

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
  const items = nativeMenuItems(props);

  return {
    actions: items.map(menuAction),
    onPressAction: (event) => runAction(items, event),
  };
}

function runAction(items: NativeMenuItem[], event: NativeActionEvent): void {
  items.find((item) => item.id === event.nativeEvent.event)?.choose();
}

function menuAction(item: NativeMenuItem): NativeMenuAction {
  return {
    id: item.id,
    title: item.title,
    ...checkState(item.checked),
    ...disabledAttributes(item.disabled),
  };
}

// MenuAction.state: 'on' draws the system check; a row that never carries it has no state.
const checkState = (
  checked: boolean | undefined,
): Pick<NativeMenuAction, 'state'> =>
  checked === undefined ? {} : { state: checked ? 'on' : 'off' };

// MenuAction.attributes.disabled: the system greys the item and does not run it.
const disabledAttributes = (
  disabled: boolean,
): Pick<NativeMenuAction, 'attributes'> =>
  disabled ? { attributes: { disabled: true } } : {};

Menu satisfies React.ComponentType<MenuProps<string>>;
