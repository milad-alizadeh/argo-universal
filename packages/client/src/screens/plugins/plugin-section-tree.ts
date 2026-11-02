import type { WireNode } from '@repo/contracts/plugins/wire';

// A section's list is declared by the ListDetail at the root of its nav item's page.
export const declaresList = (root: WireNode | null): root is WireNode =>
  root?.type === 'ListDetail';

// The page a section's root says it lands on, on a window with its list beside the pages.
export function landingOf(root: WireNode | null): string | undefined {
  const landing = declaresList(root) ? root.props.landing : undefined;

  return typeof landing === 'string' ? landing : undefined;
}

// The list alone, for the view that stays live beside the pages: its detail and empty state belong to the root's own page.
export function listOnly(root: WireNode): WireNode {
  const { list } = root.slots;

  return { ...root, slots: list ? { list } : {} };
}

// The root without its list, for the root's own page: the list is already in the sidebar.
export function withoutList(root: WireNode): WireNode {
  const { list: _list, ...slots } = root.slots;

  return { ...root, slots };
}

function linkedPage(node: WireNode): string | undefined {
  const press = node.type === 'ListItem' ? node.props.onPress : undefined;

  if (typeof press !== 'object' || press === null || !('action' in press))
    return undefined;

  return press.action === 'navigate' ? String(press.path) : undefined;
}

function linkedPages(nodes: readonly WireNode[]): string[] {
  return nodes.flatMap((node) => {
    const page = linkedPage(node);

    return [...(page ? [page] : []), ...linkedPages(node.children)];
  });
}

function marked(node: WireNode, page: string): WireNode {
  return {
    ...node,
    children: node.children.map((child) => marked(child, page)),
    props:
      linkedPage(node) === page ? { ...node.props, selected: true } : node.props,
  };
}

/*
 * Marks the row of the page the section is showing, so a Plugin passes no selection on each page. `pages` is the
 * section's stack, shown page first: a page pushed from a row keeps that row selected, as no row links to it.
 */
export function withSelectedRow(
  root: WireNode,
  pages: readonly string[],
): WireNode {
  const list = root.slots.list ?? [];
  const linked = new Set(linkedPages(list));
  const page = pages.find((candidate) => linked.has(candidate));

  if (page === undefined) return root;

  return {
    ...root,
    slots: { ...root.slots, list: list.map((node) => marked(node, page)) },
  };
}
