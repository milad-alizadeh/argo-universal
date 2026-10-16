import * as RadixContextMenu from '@radix-ui/react-context-menu';
import { type ComponentType, type ReactElement, useRef } from 'react';
import { View } from 'react-native';
import { cn } from '#lib/generic/utils';
import { Icon } from '#primitives/display/icon';
import { Text, TextClassContext } from '#primitives/display/text';
import type { ContextMenuItem, ContextMenuProps } from './context-menu-props';
import {
  actionItemClassName,
  actionItemTextClassName,
  menuRowsClassName,
} from './menu-styles';

/*
 * The web's context menu, on Radix Context Menu (`@radix-ui/react-context-menu`): Root, Trigger `asChild`,
 * Portal, Content `loop`/`onCloseAutoFocus`, Item `onSelect`/`disabled` and Separator. A right-click, the
 * context-menu key, Shift+F10 or a long touch opens it at the pointer; it draws the action menu's rows.
 */
export function ContextMenu(props: ContextMenuProps): ReactElement {
  const chosen = useChosenAction();

  return (
    <RadixContextMenu.Root>
      <ContextMenuTrigger {...props} />
      <RadixContextMenu.Portal>
        <ContextMenuContent groups={props.groups} chosen={chosen} />
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
  'bg-card border-border min-w-40 overflow-hidden rounded-2xl border p-1 web:shadow-card',
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

type ContentProps = Pick<ContextMenuProps, 'groups'> & {
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

const menuRows = (props: ContentProps): ReactElement[] =>
  props.groups.flatMap((group, index) => groupRows(group, index, props.chosen));

// A group's rows, after a separator when it follows another group.
function groupRows(
  group: readonly ContextMenuItem[],
  index: number,
  chosen: ChosenAction,
): ReactElement[] {
  const rows = group.map((item) => (
    <ContextMenuRow key={item.label} item={item} chosen={chosen} />
  ));

  if (index === 0) return rows;

  return [<GroupSeparator key={`separator.${index}`} />, ...rows];
}

function GroupSeparator(): ReactElement {
  return (
    <RadixContextMenu.Separator asChild>
      <View className="mx-2 my-0.5 h-px bg-border" />
    </RadixContextMenu.Separator>
  );
}

type RowProps = { item: ContextMenuItem; chosen: ChosenAction };

function ContextMenuRow({ item, chosen }: RowProps): ReactElement {
  return (
    <TextClassContext.Provider value={actionItemTextClassName}>
      <RadixContextMenu.Item {...itemProps(item, chosen)}>
        <View className={actionItemClassName}>
          {item.icon && <Icon name={item.icon} role="body" />}
          <Text>{item.label}</Text>
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
  onSelect: () => chosen.choose(item),
});

ContextMenu satisfies ComponentType<ContextMenuProps>;
