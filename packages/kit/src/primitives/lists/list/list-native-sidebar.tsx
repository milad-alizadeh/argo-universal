import { isValidElement, useState, type ReactNode } from 'react';
import { Icon } from '#primitives/content/icon';
import type { ListItemProps } from '#primitives/lists/list-item';
import { flattenedChildren } from '../../../flattened-children';
import { nestingRow } from '../../../list-tree';
import type { DrawnIcon } from '../../../symbols/icon-symbol';
import {
  NativeSidebarList,
  type SidebarRow,
  type SidebarSection,
} from '../native-sidebar';
import { isSection } from './list-level-entries';
import type { ListProps } from './list-props';

function iconOf(node: ReactNode): DrawnIcon | undefined {
  if (isValidElement<{ name: DrawnIcon }>(node) && node.type === Icon)
    return node.props.name;

  return undefined;
}

function items(children: ReactNode): React.ReactElement<ListItemProps>[] {
  return flattenedChildren(children).filter(
    (child): child is React.ReactElement<ListItemProps> =>
      isValidElement<ListItemProps>(child) && nestingRow(child),
  );
}

function supportedRows(children: ReactNode): boolean {
  return flattenedChildren(children).every(
    (child) =>
      child == null ||
      child === false ||
      (isValidElement<ListItemProps>(child) &&
        nestingRow(child) &&
        typeof child.props.title === 'string' &&
        supportedRows(child.props.children)),
  );
}

export function supportsNativeSidebar<Item>(list: ListProps<Item>): boolean {
  return (
    list.items === undefined &&
    list.onMove === undefined &&
    flattenedChildren(list.children).every((child) =>
      isSection(child)
        ? supportedRows(child.props.children)
        : supportedRows(child),
    )
  );
}

function sidebarRows(
  children: ReactNode,
  parent: string,
  view: {
    folded: ReadonlySet<string>;
    toggle: (id: string) => void;
    depth: number;
  },
): SidebarRow[] {
  const { folded, toggle, depth } = view;

  return items(children).flatMap(({ key, props }, index) => {
    const id = `${parent}/${String(key ?? index)}`;
    const nested = items(props.children);
    const collapsed = folded.has(id);

    return [
      {
        id,
        title: props.title,
        subtitle: props.subtitle,
        icon: iconOf(props.leading),
        value:
          typeof props.value === 'number' ? String(props.value) : props.value,
        depth,
        selected: props.selected,
        onPress:
          nested.length && !props.onPress ? () => toggle(id) : props.onPress,
      },
      ...(collapsed
        ? []
        : sidebarRows(nested, id, { folded, toggle, depth: depth + 1 })),
    ];
  });
}

function sidebarSections(
  children: ReactNode,
  folded: ReadonlySet<string>,
  toggle: (id: string) => void,
): SidebarSection[] {
  return flattenedChildren(children).flatMap((child, index) => {
    if (!isSection(child)) {
      return sidebarRows(child, String(index), {
        folded,
        toggle,
        depth: 0,
      }).map((row) => ({
        id: row.id,
        rows: [row],
      }));
    }

    const { title, collapsible, children, isExpanded, onExpandedChange } =
      child.props;

    const id = String(child.key ?? index);

    return [
      {
        id,
        title,
        expanded: collapsible ? (isExpanded ?? !folded.has(id)) : undefined,
        onExpandedChange: collapsible
          ? (onExpandedChange ?? (() => toggle(id)))
          : undefined,
        rows: sidebarRows(children, id, { folded, toggle, depth: 0 }),
      },
    ];
  });
}

export function PluginSidebar<Item>({
  list,
}: {
  list: ListProps<Item>;
}): ReactNode {
  const [folded, setFolded] = useState<ReadonlySet<string>>(() => new Set());

  const toggle = (id: string): void =>
    setFolded((previous) => {
      const updated = new Set(previous);

      if (updated.has(id)) updated.delete(id);
      else updated.add(id);

      return updated;
    });

  return (
    <NativeSidebarList
      sections={sidebarSections(list.children, folded, toggle)}
      empty={list.empty}
      onRefresh={
        list.onRefresh &&
        (async () => {
          await list.onRefresh?.();
        })
      }
    />
  );
}
