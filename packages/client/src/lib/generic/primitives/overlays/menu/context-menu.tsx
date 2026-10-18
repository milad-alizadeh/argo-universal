import * as RadixContextMenu from '@radix-ui/react-context-menu';
import { Fragment } from 'react';
import { type ComponentType, type ReactElement, useRef } from 'react';
import { View } from 'react-native';
import { cn } from '#lib/generic/utils';
import { TextClassContext } from '#primitives/content/text';
import type { ContextMenuItem, ContextMenuProps } from './context-menu-props';
import { MenuActionLabel } from './menu-action-label';
import { MenuSection } from './menu-section';
import {
  actionItemClassName,
  actionItemTextClassName,
  menuRowsClassName,
} from './menu-styles';

/*
 * The web's context menu, on Radix Context Menu (`@radix-ui/react-context-menu`): Root, Trigger `asChild`,
 * Portal, Content `loop`/`onCloseAutoFocus`, and Item `onSelect`/`disabled`. A right-click, the
 * context-menu key, Shift+F10 or a long touch opens it at the pointer; it draws the action menu's rows.
 */
export function ContextMenu(props: ContextMenuProps): ReactElement {
  const chosen = useChosenAction();

  return (
    <RadixContextMenu.Root>
      <ContextMenuTrigger {...props} />
      <RadixContextMenu.Portal>
        <ContextMenuContent
          groups={props.groups}
          groupTitles={props.groupTitles}
          chosen={chosen}
        />
      </RadixContextMenu.Portal>
    </RadixContextMenu.Root>
  );
}

function ContextMenuTrigger(props: ContextMenuProps): ReactElement {
  return (
    <RadixContextMenu.Trigger asChild>
      {/* Lays out as its child alone, so wrapping a row changes nothing on the page. */}
      <div className="contents" onDoubleClick={props.onDoubleClick}>
        {props.children}
      </div>
    </RadixContextMenu.Trigger>
  );
}

const contentClassName = cn(
  'bg-card dark:border-border min-w-65 overflow-hidden rounded-2xl dark:border px-1 py-2 web:shadow-card',
  menuRowsClassName,
  'web:animate-in web:fade-in-0 web:zoom-in-95 web:max-h-(--radix-context-menu-content-available-height) web:overflow-y-auto web:origin-(--radix-context-menu-content-transform-origin) web:cursor-default',
);

interface ChosenAction {
  choose: (item: ContextMenuItem) => void;
  onCloseAutoFocus: (event: Event) => void;
}

// A chosen action runs once the menu has closed and let go of focus, so a dialog it opens keeps focus in its field.
function useChosenAction(): ChosenAction {
  const pending = useRef<(() => void) | null>(null);

  return {
    choose: (item) => {
      pending.current = item.onPress;
    },
    onCloseAutoFocus: (event) => runChosen(pending, event),
  };
}

// Escape, or a press outside, chooses nothing: focus goes back to the element as Radix returns it.
function runChosen(
  pending: { current: (() => void) | null },
  event: Event,
): void {
  const run = pending.current;

  pending.current = null;

  if (!run) return;
  event.preventDefault();
  run();
}

type ContentProps = Pick<ContextMenuProps, 'groups' | 'groupTitles'> & {
  chosen: ChosenAction;
};

function ContextMenuContent(props: ContentProps): ReactElement {
  return (
    <TextClassContext.Provider value="text-foreground">
      <RadixContextMenu.Content
        loop
        className="z-50"
        onCloseAutoFocus={props.chosen.onCloseAutoFocus}
      >
        <View className={contentClassName}>{menuRows(props)}</View>
      </RadixContextMenu.Content>
    </TextClassContext.Provider>
  );
}

// The web draws its groups as one run of rows, with no separator between them.
const menuRows = (props: ContentProps): ReactElement[] =>
  props.groups.map((group, index) => (
    <Fragment key={group.map((item) => item.id ?? item.label).join()}>
      <MenuSection divided={index > 0} title={props.groupTitles?.[index]} />
      {group.map((item) => (
        <ContextMenuRow
          key={item.id ?? item.label}
          item={item}
          chosen={props.chosen}
        />
      ))}
    </Fragment>
  ));

type RowProps = { item: ContextMenuItem; chosen: ChosenAction };

function ContextMenuRow({ item, chosen }: RowProps): ReactElement {
  return (
    <TextClassContext.Provider value={itemTextClass(item)}>
      <RadixContextMenu.Item {...itemProps(item, chosen)}>
        <View className={contextRowClass(item)}>
          <MenuActionLabel {...item} />
        </View>
      </RadixContextMenu.Item>
    </TextClassContext.Provider>
  );
}

const itemProps = (
  item: ContextMenuItem,
  chosen: ChosenAction,
): RadixContextMenu.ContextMenuItemProps => ({
  asChild: true,
  disabled: item.disabled,
  'aria-label': item.label,
  onSelect: () => chosen.choose(item),
});

ContextMenu satisfies ComponentType<ContextMenuProps>;

function itemTextClass(item: ContextMenuItem): string {
  return item.tone === 'danger' ? 'text-danger' : actionItemTextClassName;
}

function contextRowClass(item: ContextMenuItem): string {
  return cn(
    actionItemClassName,
    item.tone === 'danger' && 'web:focus:bg-danger/10 active:bg-danger/10',
  );
}
