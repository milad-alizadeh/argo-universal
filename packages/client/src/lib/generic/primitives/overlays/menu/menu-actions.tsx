import * as RadixMenu from '@radix-ui/react-dropdown-menu';
import type * as React from 'react';
import { Fragment } from 'react';
import { View } from 'react-native';
import { TextClassContext } from '#primitives/content/text';
import { MenuActionLabel } from './menu-action-label';
import type { KeyboardFocus } from './menu-choices';
import { contentFocus } from './menu-content-focus';
import { MenuLoadingRow } from './menu-loading';
import type { ActionMenuProps, MenuAction } from './menu-props';
import { MenuSection } from './menu-section';
import {
  actionContentClassName,
  menuRowClass,
  menuTextClass,
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

function actionItem(action: MenuAction, index: number): React.JSX.Element {
  return (
    <Fragment key={index}>
      {action.section && (
        <MenuSection divided={index > 0} title={action.section.title} />
      )}
      <MenuActionItem action={action} />
    </Fragment>
  );
}

function MenuActionItem({ action }: { action: MenuAction }): React.JSX.Element {
  return (
    <TextClassContext.Provider value={menuTextClass(action.tone)}>
      <RadixMenu.Item {...actionItemProps(action)}>
        <View {...actionRow(action)}>
          <MenuActionLabel {...action} />
        </View>
      </RadixMenu.Item>
    </TextClassContext.Provider>
  );
}

function actionItemProps(action: MenuAction): RadixMenu.DropdownMenuItemProps {
  return {
    asChild: true,
    'aria-label': action.label,
    disabled: action.disabled,
    onSelect: action.onPress,
  };
}

function actionRow(action: MenuAction): React.ComponentProps<typeof View> {
  return {
    className: menuRowClass(action.tone),
    accessibilityState:
      action.selected === undefined ? undefined : { selected: action.selected },
  };
}
