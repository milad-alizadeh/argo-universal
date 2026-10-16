import * as RadixContextMenu from '@radix-ui/react-context-menu';
import type { ComponentType, ReactElement } from 'react';
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
 * Portal, Content `loop`, Item `onSelect`/`disabled` and Separator. A right-click, the context-menu key,
 * Shift+F10 or a long touch opens it at the pointer; it draws the action menu's rows.
 */
export function ContextMenu(props: ContextMenuProps): ReactElement {
  return (
    <RadixContextMenu.Root>
      <RadixContextMenu.Trigger asChild>
        {/* Lays out as its child alone, so wrapping a row changes nothing on the page. */}
        <div className="contents" onDoubleClick={props.onDoubleClick}>
          {props.children}
        </div>
      </RadixContextMenu.Trigger>
      <RadixContextMenu.Portal>
        <ContextMenuContent groups={props.groups} />
      </RadixContextMenu.Portal>
    </RadixContextMenu.Root>
  );
}

const contentClassName = cn(
  'bg-card border-border min-w-40 overflow-hidden rounded-2xl border p-1 web:shadow-card',
  menuRowsClassName,
  'web:animate-in web:fade-in-0 web:zoom-in-95 web:max-h-(--radix-context-menu-content-available-height) web:overflow-y-auto web:origin-(--radix-context-menu-content-transform-origin) web:cursor-default',
);

function ContextMenuContent(
  props: Pick<ContextMenuProps, 'groups'>,
): ReactElement {
  return (
    <TextClassContext.Provider value="text-foreground">
      <RadixContextMenu.Content loop className="z-50">
        <View className={contentClassName}>
          {props.groups.flatMap(groupRows)}
        </View>
      </RadixContextMenu.Content>
    </TextClassContext.Provider>
  );
}

// A group's rows, after a separator when it follows another group.
function groupRows(
  group: readonly ContextMenuItem[],
  index: number,
): ReactElement[] {
  const rows = group.map((item) => (
    <ContextMenuRow key={item.label} item={item} />
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

function ContextMenuRow({ item }: { item: ContextMenuItem }): ReactElement {
  return (
    <TextClassContext.Provider value={actionItemTextClassName}>
      <RadixContextMenu.Item {...itemProps(item)}>
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
): RadixContextMenu.ContextMenuItemProps => ({
  asChild: true,
  disabled: item.disabled,
  onSelect: item.onPress,
});

ContextMenu satisfies ComponentType<ContextMenuProps>;
