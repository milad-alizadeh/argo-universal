import {
  isIconName,
  type SystemSymbolSource,
} from '@repo/contracts/kit-symbols';
import { isValidElement, useState, type ReactNode } from 'react';
import type { ListItemProps } from '#primitives/lists/list-item';
import { flattenedChildren } from '../../../flattened-children';
import {
  NativeSidebarList,
  type SidebarRow,
  type SidebarSection,
} from '../../../native-sidebar';
import type { DrawnIcon } from '../../../symbols/icon-symbol';
import { isSection } from './list-level-entries';
import type { ListProps, ListSectionProps } from './list-props';

// The Plugin wire already validated the symbol names before preparing the row.
function isSystemSymbol(node: unknown): node is SystemSymbolSource {
  return (
    node !== null &&
    typeof node === 'object' &&
    'sf' in node &&
    typeof node.sf === 'string' &&
    'material' in node &&
    typeof node.material === 'string'
  );
}

function iconOf(node: ListItemProps['leading']): DrawnIcon | undefined {
  if (typeof node === 'string' && isIconName(node)) return node;
  if (isSystemSymbol(node)) return node;
  if (!isValidElement(node) && !Array.isArray(node)) return undefined;

  const [leading] = flattenedChildren(node);

  return isValidElement<{ name?: DrawnIcon }>(leading)
    ? leading.props.name
    : undefined;
}

function sidebarItem(
  child: ReactNode,
): child is React.ReactElement<ListItemProps> {
  return (
    isValidElement<ListItemProps>(child) &&
    typeof child.props.title === 'string'
  );
}

function items(children: ReactNode): React.ReactElement<ListItemProps>[] {
  return flattenedChildren(children).filter(sidebarItem);
}

function supportedRows(children: ReactNode): boolean {
  return flattenedChildren(children).every(
    (child) => sidebarItem(child) && supportedRows(child.props.children),
  );
}

function sidebarSection(
  child: ReactNode,
): child is React.ReactElement<ListSectionProps> {
  return (
    isSection(child) ||
    (isValidElement<ListSectionProps>(child) &&
      ('collapsible' in child.props || 'footer' in child.props))
  );
}

export function supportsNativeSidebar<Item>(list: ListProps<Item>): boolean {
  return (
    list.items === undefined &&
    list.onMove === undefined &&
    flattenedChildren(list.children).every((child) =>
      sidebarSection(child)
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
    if (!sidebarSection(child)) {
      return sidebarRows(child, String(index), {
        folded,
        toggle,
        depth: 0,
      }).map((row) => ({
        id: row.id,
        rows: [row],
      }));
    }

    const {
      title,
      footer,
      collapsible,
      children,
      isExpanded,
      onExpandedChange,
    } = child.props;

    const id = String(child.key ?? index);

    return [
      {
        id,
        title,
        footer,
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
