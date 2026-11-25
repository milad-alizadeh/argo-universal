import * as RadixMenu from '@radix-ui/react-dropdown-menu';
import { menuDefaults } from '@repo/contracts/kit-tokens';
import type * as React from 'react';
import { createContext, Fragment, useContext, useRef } from 'react';
import { View } from 'react-native';
import { windowEdgeInset } from '#kit/menu-surface';
import { Text, TextClassContext } from '#primitives/content/text';
import { Chevron } from '#primitives/status/chevron';
import {
  KitDrawingSelectionContext,
  type ScheduleDrawingSelection,
  wrapKitDrawing,
} from '../../../wrapped-component';
import { MenuActionLabel } from './menu-action-label';
import {
  ChoiceCheck,
  ChoiceGutterContext,
  choiceRole,
  hasChoice,
} from './menu-choice-check';
import type { KeyboardFocus } from './menu-choices';
import { contentFocus } from './menu-content-focus';
import { MenuLoadingRow } from './menu-loading';
import {
  isMenuSubmenu,
  menuActionTitle,
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

const AfterMenuCloses = createContext<ScheduleDrawingSelection | null>(null);

interface DrawingSelectionClose {
  schedule: ScheduleDrawingSelection;
  onCloseAutoFocus: (event: Event) => void;
}

function useAfterMenuCloses(): DrawingSelectionClose {
  const pending = useRef<(() => void) | null>(null);

  return {
    schedule: (select: () => void): void => {
      pending.current = select;
    },
    onCloseAutoFocus: (event: Event): void => {
      const select = pending.current;

      if (!select) return;

      pending.current = null;
      event.preventDefault();
      select();
    },
  };
}

// An action menu's web drawing: compact rows, each running its action.
export function MenuActions(props: MenuActionsProps): React.JSX.Element {
  const { schedule, onCloseAutoFocus } = useAfterMenuCloses();

  return (
    <TextClassContext.Provider value="text-foreground">
      <RadixMenu.Content {...actionContentProps(props, onCloseAutoFocus)}>
        <AfterMenuCloses value={schedule}>
          <ChoiceGutterContext.Provider value={hasChoice(props.actions)}>
            <View className={actionContentClassName}>
              {props.loading ? (
                <MenuLoadingRow />
              ) : (
                props.actions.map(actionItem)
              )}
            </View>
          </ChoiceGutterContext.Provider>
        </AfterMenuCloses>
      </RadixMenu.Content>
    </TextClassContext.Provider>
  );
}

function actionContentProps(
  props: MenuActionsProps,
  finishSelection: (event: Event) => void,
): RadixMenu.DropdownMenuContentProps {
  const focus = contentFocus(props.focus);

  return {
    align: props.align ?? menuDefaults.align,
    loop: true,
    collisionPadding: windowEdgeInset,
    className: 'z-50',
    ...focus,
    onCloseAutoFocus: (event) => {
      finishSelection(event);

      if (!event.defaultPrevented) focus.onCloseAutoFocus?.(event);
    },
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

  return wrapKitDrawing(
    submenu.wrap,
    <RadixMenu.SubTrigger asChild aria-label={label}>
      <View className={menuRowClass()}>
        <ChoiceCheck />
        <MenuActionLabel label={submenu.label} icon={submenu.icon} />
        <SubmenuCount count={submenu.count} />
        <Chevron direction="right" />
      </View>
    </RadixMenu.SubTrigger>,
  );
}

function SubmenuCount({
  count,
}: Pick<MenuSubmenu, 'count'>): React.JSX.Element | null {
  return count ? <Text tone="muted">{count}</Text> : null;
}

function MenuActionItem({ action }: { action: MenuAction }): React.JSX.Element {
  return wrapKitDrawing(action.wrap, <MenuActionDrawing action={action} />);
}

function MenuActionDrawing({
  action,
}: {
  action: MenuAction;
}): React.JSX.Element {
  const selection = useContext(KitDrawingSelectionContext);
  const afterClose = useContext(AfterMenuCloses);
  const selectDrawing = action.wrap && afterClose && selection;

  const onSelect = (): void => {
    if (afterClose && selectDrawing?.(afterClose)) return;

    action.onPress?.();
  };

  return (
    <TextClassContext.Provider value={menuTextClass(action.tone)}>
      <RadixMenu.Item {...actionItemProps(action)} onSelect={onSelect}>
        <View
          {...actionRow(action)}
          {...(selectDrawing && { dataSet: { kitDrawingSelection: true } })}
        >
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
    'aria-label': menuActionTitle(action),
    disabled: action.disabled,
    ...choiceRole(action.selected),
  };
}

function actionRow(action: MenuAction): React.ComponentProps<typeof View> {
  return { className: menuRowClass(action.tone) };
}
