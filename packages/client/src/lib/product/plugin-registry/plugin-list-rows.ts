import type { WireNode } from '@repo/contracts/plugins/wire';

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
const readAsChildren = new Set(['List.Section']);

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
