import type { WireNode } from '@repo/contracts/plugins/wire';
import { childNodeKey } from '@repo/contracts/plugins/wire-node-key';

/*
 * What a List hands its list as data: the nodes the Server sent, keyed by node key and typed by node type, so a list
 * that recycles reuses a cell only for a row of the same type.
 */
export interface ListRows {
  items: WireNode[];
  keyExtractor: (node: WireNode, index: number) => string;
  getItemType: (node: WireNode, index: number) => string;
  recycleItems: true;
}

// Rows the List reads as children for what they carry: Sections, nested rows, native rows and moves.
const sectionType = 'List.Section';

const readAsChildren = new Set([sectionType]);

const isNativeRow = (node: WireNode): boolean =>
  node.type.startsWith('FieldGroup');

const keepsChildren = (child: WireNode): boolean =>
  readAsChildren.has(child.type) ||
  isNativeRow(child) ||
  child.children.length > 0;

// A grid or shelf flows its rows where no list measures them, and moves read their rows' ids from children.
const flowsOrMoves = ({ props }: WireNode): boolean =>
  props.onMove !== undefined ||
  props.layout === 'grid' ||
  props.layout === 'lanes' ||
  props.direction === 'horizontal';

const rows: Omit<ListRows, 'items'> = {
  keyExtractor: (node) => node.key,
  getItemType: (node) => node.type,
  recycleItems: true,
};

// A flat List draws its rows as data; a List of Sections, nested rows, native rows or moves keeps drawing its children.
export function listRowsOf(node: WireNode): ListRows | undefined {
  if (node.type !== 'List' || flowsOrMoves(node)) return undefined;

  if (node.children.some(keepsChildren)) return undefined;

  return { ...rows, items: node.children };
}

// A Table reads its rows by the cells they hold, so it takes the row nodes alone: no key, type or recycling of its own.
export const tableRowsOf = (
  node: WireNode,
): Pick<ListRows, 'items'> | undefined =>
  node.type === 'Table' ? { items: node.children } : undefined;

// A row of an entry List: its node, and the address it draws at, so a row keeps its state wherever the List reads it.
export interface RowItem {
  node: WireNode;
  key: string;
}

// The kit's entries, with a Section's props as the renderer drew them.
export type PluginEntry<Section> =
  | { key: string; item: RowItem }
  | { key: string; section: Section; entries: PluginEntry<Section>[] };

// A native grouped List draws FieldGroup rows from its children alone.
const holdsNativeRow = (nodes: readonly WireNode[]): boolean =>
  nodes.some(
    (child) =>
      isNativeRow(child) ||
      (child.type === sectionType && holdsNativeRow(child.children)),
  );

interface Entries<Section> {
  nodes: readonly WireNode[];
  parent: string;
  sectionProps: (section: WireNode, key: string) => Section;
}

function entriesIn<Section>({
  nodes,
  parent,
  sectionProps,
}: Entries<Section>): PluginEntry<Section>[] {
  return nodes.map((child) => {
    const key = childNodeKey(parent, child.key);

    if (child.type !== sectionType)
      return { key: child.key, item: { node: child, key } };

    return {
      key: child.key,
      section: sectionProps(child, key),
      entries: entriesIn({ nodes: child.children, parent: key, sectionProps }),
    };
  });
}

/*
 * A List's Sections and rows as the kit's entries, the structure its children would spell, for a List that is not a
 * flat run of rows: Sections, nested rows, moves, grids and lanes. `sectionProps` draws a Section's own props.
 */
export function listEntriesOf<Section>(
  node: WireNode,
  key: string,
  sectionProps: Entries<Section>['sectionProps'],
): PluginEntry<Section>[] | undefined {
  if (node.type !== 'List' || holdsNativeRow(node.children)) return undefined;

  return entriesIn({ nodes: node.children, parent: key, sectionProps });
}
