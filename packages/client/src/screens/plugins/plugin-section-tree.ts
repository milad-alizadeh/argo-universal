import type { WireNode } from '@repo/contracts/plugins/wire';
import { z } from 'zod';

// A section's list is declared by the ListDetail at the root of its nav item's page.
export const declaresList = (
  root: WireNode | null | undefined,
): root is WireNode => root?.type === 'ListDetail';

// The root itself is where the section already is, so naming it lands nowhere.
const isLanding = (landing: unknown): landing is string =>
  typeof landing === 'string' && landing !== '/';

// The page a section's root says it lands on, on a window with its list beside the pages.
export function landingOf(
  root: WireNode | null | undefined,
): string | undefined {
  if (!declaresList(root)) return undefined;

  const { landing } = root.props;

  return isLanding(landing) ? landing : undefined;
}

// The list alone, for the view that stays live beside the pages: its detail and empty state belong to the root's own page.
export function listOnly(root: WireNode): WireNode {
  const { list } = root.slots;

  return { ...root, slots: list ? { list } : {} };
}

// The root without its list, for the root's own page: the list is already in the sidebar.
export function withoutList(root: WireNode): WireNode {
  const slots = Object.entries(root.slots).filter(([name]) => name !== 'list');

  return { ...root, slots: Object.fromEntries(slots) };
}

const navigatePress = z.object({
  action: z.literal('navigate'),
  path: z.string(),
});

function linkedPage(node: WireNode): string | undefined {
  if (node.type !== 'ListItem') return undefined;

  return navigatePress.safeParse(node.props.onPress).data?.path;
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
      linkedPage(node) === page
        ? { ...node.props, selected: true }
        : node.props,
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
