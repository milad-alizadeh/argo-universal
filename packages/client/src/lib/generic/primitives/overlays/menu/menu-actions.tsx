import * as RadixMenu from '@radix-ui/react-dropdown-menu';
import type * as React from 'react';
import { View } from 'react-native';
import { Text, TextClassContext } from '#primitives/display/text';
import { MenuLoadingRow } from './menu-loading';
import type { ActionMenuProps, MenuAction } from './menu-props';
import {
  actionContentClassName,
  actionItemClassName,
  actionItemTextClassName,
} from './menu-styles';

// An action menu's web drawing: compact rows, each running its action.
export function MenuActions(props: ActionMenuProps): React.JSX.Element {
  return (
    <TextClassContext.Provider value="text-foreground">
      {/* Radix's popper wrapper copies the content's z-index, so the content keeps it above other overlays. */}
      <RadixMenu.Content align={props.align ?? 'end'} loop className="z-50">
        <View className={actionContentClassName}>
          {props.loading ? <MenuLoadingRow /> : props.actions.map(actionItem)}
        </View>
      </RadixMenu.Content>
    </TextClassContext.Provider>
  );
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
