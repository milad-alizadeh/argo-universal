import * as RadixMenu from '@radix-ui/react-dropdown-menu';
import type * as React from 'react';
import { View } from 'react-native';
import { Text, TextClassContext } from '#primitives/display/text';
import type { KeyboardFocus } from './menu-choices';
import { contentFocus } from './menu-content-focus';
import { MenuLoadingRow } from './menu-loading';
import type { ActionMenuProps, MenuAction } from './menu-props';
import {
  actionContentClassName,
  actionItemClassName,
  actionItemTextClassName,
} from './menu-styles';

type MenuActionsProps = ActionMenuProps & { focus: KeyboardFocus };

// An action menu's web drawing: compact rows, each running its action.
export function MenuActions(props: MenuActionsProps): React.JSX.Element {
  return (
    <TextClassContext.Provider value="text-foreground">
      {/* Radix's popper wrapper copies the content's z-index, so the content keeps it above other overlays. */}
      <RadixMenu.Content {...actionContentProps(props)}>
        <View className={actionContentClassName}>
          {props.loading ? <MenuLoadingRow /> : props.actions.map(actionItem)}
        </View>
      </RadixMenu.Content>
    </TextClassContext.Provider>
  );
}

function actionContentProps(
  props: MenuActionsProps,
): RadixMenu.DropdownMenuContentProps {
  return {
    align: props.align ?? 'end',
    loop: true,
    className: 'z-50',
    ...contentFocus(props.focus),
  };
}

function actionItem(action: MenuAction): React.JSX.Element {
  return <MenuActionItem key={action.label} action={action} />;
}

function MenuActionItem({ action }: { action: MenuAction }): React.JSX.Element {
  return (
    <TextClassContext.Provider value={actionItemTextClassName}>
      <RadixMenu.Item
        asChild
        disabled={action.disabled}
        onSelect={action.onPress}
      >
        <View {...actionRow(action)}>
          {action.content ?? <Text>{action.label}</Text>}
        </View>
      </RadixMenu.Item>
    </TextClassContext.Provider>
  );
}

function actionRow(action: MenuAction): React.ComponentProps<typeof View> {
  return {
    className: actionItemClassName,
    accessibilityState:
      action.selected === undefined ? undefined : { selected: action.selected },
  };
}
