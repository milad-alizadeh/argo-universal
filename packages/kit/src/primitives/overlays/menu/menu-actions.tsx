import * as RadixMenu from '@radix-ui/react-dropdown-menu';
import { menuDefaults } from '@repo/contracts/kit-tokens';
import type * as React from 'react';
import { Fragment } from 'react';
import { View } from 'react-native';
import { windowEdgeInset } from '#kit/menu-surface';
import { IconSlot } from '#primitives/content/icon';
import { Text, TextClassContext } from '#primitives/content/text';
import { Chevron } from '#primitives/status/chevron';
import { SelectedCheck } from '#primitives/status/selected-check';
import { MenuActionLabel } from './menu-action-label';
import type { KeyboardFocus } from './menu-choices';
import { contentFocus } from './menu-content-focus';
import { MenuLoadingRow } from './menu-loading';
import {
  isMenuSubmenu,
  type ActionMenuProps,
  type MenuAction,
  type MenuEntry,
  type MenuSubmenu,
} from './menu-props';
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
    align: props.align ?? menuDefaults.align,
    loop: true,
    collisionPadding: windowEdgeInset,
    className: 'z-50',
    ...contentFocus(props.focus),
  };
}

function actionItem(entry: MenuEntry, index: number): React.JSX.Element {
  return (
    <Fragment key={index}>
      {entry.section && (
        <MenuSection divided={index > 0} title={entry.section.title} />
      )}
      {isMenuSubmenu(entry) ? (
        <MenuSubmenuItem submenu={entry} />
      ) : (
        <MenuActionItem action={entry} />
      )}
    </Fragment>
  );
}

type SubmenuProps = { submenu: MenuSubmenu };

// Radix's Sub: its trigger row opens the nested rows beside it, by pointer or by the arrow key.
function MenuSubmenuItem({ submenu }: SubmenuProps): React.JSX.Element {
  return (
    <RadixMenu.Sub>
      <SubmenuTrigger submenu={submenu} />
      <SubmenuRows actions={submenu.actions} />
    </RadixMenu.Sub>
  );
}

// The nested rows open in their own portal, drawn as the menu they came from.
function SubmenuRows({
  actions,
}: {
  actions: readonly MenuEntry[];
}): React.JSX.Element {
  return (
    <RadixMenu.Portal>
      <RadixMenu.SubContent className="z-50" sideOffset={4}>
        <View className={actionContentClassName}>
          {actions.map(actionItem)}
        </View>
      </RadixMenu.SubContent>
    </RadixMenu.Portal>
  );
}

// The row names the submenu, then its count, its trailing chevron pointing to where the rows open.
function SubmenuTrigger({ submenu }: SubmenuProps): React.JSX.Element {
  const label = submenu.accessibilityLabel ?? submenu.label;

  return (
    <RadixMenu.SubTrigger asChild aria-label={label}>
      <View className={menuRowClass()}>
        <MenuActionLabel {...submenu} />
        <SubmenuCount count={submenu.count} />
        <Chevron direction="right" />
      </View>
    </RadixMenu.SubTrigger>
  );
}

function SubmenuCount({
  count,
}: Pick<MenuSubmenu, 'count'>): React.JSX.Element | null {
  return count ? <Text tone="muted">{count}</Text> : null;
}

function MenuActionItem({ action }: { action: MenuAction }): React.JSX.Element {
  return (
    <TextClassContext.Provider value={menuTextClass(action.tone)}>
      <RadixMenu.Item {...actionItemProps(action)}>
        <View {...actionRow(action)}>
          <ChoiceCheck selected={action.selected} />
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
    ...choiceRole(action.selected),
  };
}

// An action that can be the selected one is a radio row, as the native menus check it.
function choiceRole(
  selected: boolean | undefined,
): Pick<RadixMenu.DropdownMenuItemProps, 'role' | 'aria-checked'> {
  if (selected === undefined) return {};

  return { role: 'menuitemradio', 'aria-checked': selected };
}

// The leading check on the selected action, as every popover row (owner, 2026-10-20); the others keep its place, so labels line up.
function ChoiceCheck({
  selected,
}: Pick<MenuAction, 'selected'>): React.JSX.Element | null {
  if (selected === undefined) return null;

  return (
    <IconSlot>
      {selected ? <SelectedCheck className="text-foreground" /> : null}
    </IconSlot>
  );
}

function actionRow(action: MenuAction): React.ComponentProps<typeof View> {
  return { className: menuRowClass(action.tone) };
}
