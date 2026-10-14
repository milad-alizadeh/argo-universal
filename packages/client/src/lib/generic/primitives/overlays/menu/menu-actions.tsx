import * as MenuPrimitive from '@rn-primitives/dropdown-menu';
import type * as React from 'react';
import { Text, TextClassContext } from '#primitives/display/text';
import type { ActionMenuProps, MenuAction } from './menu-props';
import {
  actionContentClassName,
  actionItemClassName,
  actionItemTextClassName,
} from './menu-styles';

// An action menu's web drawing: compact rows, each running its action.
export function MenuActions(props: ActionMenuProps): React.JSX.Element {
  return (
    <MenuPrimitive.Overlay>
      <TextClassContext.Provider value="text-popover-foreground">
        <MenuPrimitive.Content
          align={props.align ?? 'end'}
          className={actionContentClassName}
        >
          {props.actions.map(actionItem)}
        </MenuPrimitive.Content>
      </TextClassContext.Provider>
    </MenuPrimitive.Overlay>
  );
}

function actionItem(action: MenuAction): React.JSX.Element {
  return <MenuActionItem key={action.label} action={action} />;
}

function MenuActionItem({ action }: { action: MenuAction }): React.JSX.Element {
  return (
    <TextClassContext.Provider value={actionItemTextClassName}>
      <MenuPrimitive.Item
        className={actionItemClassName}
        accessibilityState={selectedState(action)}
        onPress={action.onPress}
        onKeyDown={stopSecondSelect}
      >
        {action.content ?? <Text>{action.label}</Text>}
      </MenuPrimitive.Item>
    </TextClassContext.Provider>
  );
}

type ItemKeyDown = NonNullable<
  React.ComponentProps<typeof MenuPrimitive.Item>['onKeyDown']
>;

// The RN adapter selects on keydown; stop Radix's synthetic click selecting twice.
const stopSecondSelect: ItemKeyDown = (event) => {
  if (event.key === 'Enter' || event.key === ' ') event.preventDefault();
};

function selectedState(action: MenuAction): { selected: boolean } | undefined {
  return action.selected === undefined
    ? undefined
    : { selected: action.selected };
}
