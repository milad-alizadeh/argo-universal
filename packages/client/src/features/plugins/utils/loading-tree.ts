import type { WireNode } from '@repo/contracts/plugins/wire';

// Rows enough to fill a tall window; a skeleton of more is never seen and costs its draw.
const keptRows = 12;

// A loading tree larger than this, in characters, is a page with more than rows in it, and not worth a Device's storage.
const largestLoadingTree = 65_536;

// Kinds that hold rows: a loading tree keeps their first few.
const rowHolders = new Set(['List', 'ListSection', 'Board']);

// What a loading tree never does: press, load more, refresh or show a row's menu.
const isHandler = (name: string): boolean =>
  name.startsWith('on') || name === 'pagination';

const drawnProps = (props: WireNode['props']): WireNode['props'] =>
  Object.fromEntries(
    Object.entries(props).filter(([name]) => !isHandler(name)),
  );

const drawnSlots = (slots: WireNode['slots']): WireNode['slots'] =>
  Object.fromEntries(
    Object.entries(slots)
      .filter(([name]) => name !== 'actions')
      .map(([name, nodes]) => [name, nodes.map(stillOf)]),
  );

const firstChildren = (node: WireNode): WireNode[] =>
  rowHolders.has(node.type) ? node.children.slice(0, keptRows) : node.children;

// The node as it draws, without what it does.
function stillOf(node: WireNode): WireNode {
  return {
    type: node.type,
    key: node.key,
    props: drawnProps(node.props),
    slots: drawnSlots(node.slots),
    children: firstChildren(node).map(stillOf),
  };
}

/*
 * What a Skeleton draws while a page loads next time: the page's tree as last drawn with only its first rows, so the
 * loading page has the rows' own marks, lines and Pills, and nothing they did when pressed. Null when the page is too
 * large to keep.
 */
export function loadingTree(root: WireNode): WireNode | null {
  const still = stillOf(root);

  return JSON.stringify(still).length > largestLoadingTree ? null : still;
}
