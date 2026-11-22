import type { WireNode } from '@repo/contracts/plugins/wire';

// Rows enough to fill a tall window; a skeleton of more is never seen and costs its draw.
const keptRows = 15;

// Kinds that hold rows: a loading tree keeps their first few.
const rowHolders = new Set(['List', 'ListSection', 'Board']);

/*
 * What a loading tree never does: press, load more, refresh or show a row's menu. A handler is `on` and a capital,
 * so data such as `ongoing` stays.
 */
const isHandler = (name: string): boolean =>
  /^on[A-Z]/.test(name) || name === 'pagination';

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

// Kinds that open over the page: a loading page shows none of them, open or not.
const overlays = new Set(['Inspector', 'Sheet', 'Dialog', 'Alert']);

// Kinds that load as their card alone, with nothing inside and no level, so the Skeleton covers each shell whole.
const shells = new Set(['Fader']);

// What a shell keeps: its shape, not its level or what it holds.
const shellProps = new Set(['orientation', 'minimumValue', 'maximumValue']);

const shellOf = (node: WireNode): WireNode => ({
  type: node.type,
  key: node.key,
  props: Object.fromEntries(
    Object.entries(node.props).filter(([name]) => shellProps.has(name)),
  ),
  slots: {},
  children: [],
});

const drawnChildren = (node: WireNode): WireNode[] =>
  firstChildren(node)
    .filter(({ type }) => !overlays.has(type))
    .map(stillOf);

// The node as it draws, without what it does.
function stillOf(node: WireNode): WireNode {
  if (shells.has(node.type)) return shellOf(node);

  return {
    type: node.type,
    key: node.key,
    props: drawnProps(node.props),
    slots: drawnSlots(node.slots),
    children: drawnChildren(node),
  };
}

/*
 * What a Skeleton draws while a page loads next time: the page's tree as last drawn with only its first rows, so the
 * loading page has the rows' own marks, lines and Pills, and nothing they did when pressed. A card that holds a
 * level and controls, a Fader, loads as its empty shell, and nothing that opens over the page loads at all.
 */
export const loadingTree = (root: WireNode): WireNode => stillOf(root);
