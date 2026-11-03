import type { WireNode } from '@repo/contracts/plugins/wire';
import { z } from 'zod';
import { originOf, pluginPageRoute } from './plugin-page-route';
import type { PluginSection } from './use-plugin-sections';

// A section's list is declared by the ListDetail at the root of its nav item's page.
export const declaresList = (
  root: WireNode | null | undefined,
): root is WireNode => root?.type === 'ListDetail';

// The page a section's root says it lands on, on a window with its list beside the pages.
export function landingOf(
  root: WireNode | null | undefined,
): string | undefined {
  if (!declaresList(root)) return undefined;

  const { landing } = root.props;

  return typeof landing === 'string' ? landing : undefined;
}

/*
 * The route a section lands on, which replaces the section's own stack, so it must be a page of that nav item. Its root
 * is where the section already is, and another nav item's page belongs to another stack, so naming either lands nowhere.
 */
export function landingRoute(
  sections: readonly PluginSection[],
  section: PluginSection,
  landing: string,
): string[] | undefined {
  const route = pluginPageRoute(sections, originOf(section), landing);

  return route && belowRootOf(section, route) ? route : undefined;
}

const belowRootOf = (section: PluginSection, route: string[]): boolean => {
  const [, navId, ...page] = route;

  return navId === section.navId && page.length > section.navPath.length;
};

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

// The page a row opens: a ListItem whose press navigates.
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

// The node with the row linking to `page` selected; a branch with no such row is the same node, so it draws no change.
function marked(node: WireNode, page: string): WireNode {
  if (linkedPage(node) === page) {
    return { ...node, props: { ...node.props, selected: true } };
  }

  const children = node.children.map((child) => marked(child, page));

  return sameNodes(children, node.children) ? node : { ...node, children };
}

const sameNodes = (
  nodes: readonly WireNode[],
  others: readonly WireNode[],
): boolean => nodes.every((node, index) => node === others[index]);

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
