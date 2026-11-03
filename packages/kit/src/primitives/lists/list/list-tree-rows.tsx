import { cloneElement, isValidElement, type ReactNode } from 'react';
import {
  childRows,
  childTree,
  ListTreeContext,
  type TreeRow,
} from '../../../list-tree';
import { sameElement } from './list-child-identity';

// How a List flattens its tree of ListItems: which parents are folded, and whether a wide window draws the tree at all.
export interface TreeFolding {
  folded: ReadonlySet<string>;
  // Folds or opens the parent row at `key`; one function for the List's life.
  toggle: (key: string) => void;
  drawn: boolean;
  // Each tree row's content as last drawn, held by the props it was drawn from.
  kept: KeptContents;
}

/*
 * A tree row's content, kept with what it was drawn from, so a row drawn from the same keeps the same element. It is
 * held by the row's props, so it goes when its element does.
 */
interface KeptContent {
  child: ReactNode;
  place: string;
  content: ReactNode;
}

export type KeptContents = WeakMap<object, KeptContent>;

export const keptContents = (): KeptContents => new WeakMap();

// One of a List's own children, or a child ListItem lifted out of its parent to a row of its own.
export interface TreeChild {
  child: ReactNode;
  key: string;
  content: ReactNode;
  // Lifted out of a parent row: it moves with its parent, never on its own.
  nested: boolean;
}

interface Level {
  prefix: string;
  depth: number;
  through: readonly boolean[];
  // A List.Section among a List's own children stays as it is; its rows are flattened with its own children.
  passes: (child: ReactNode) => boolean;
  // A child's own key, when it has one: a moving row keeps it wherever it moves.
  keyed?: (child: ReactNode) => string | undefined;
}

// Where one child sits among its siblings.
interface Place {
  level: Level;
  key: string;
  last: boolean;
}

// Where it sits: its React key, or its index when it has none.
const placeKey = (child: ReactNode, prefix: string, index: number): string =>
  `${prefix}/${isValidElement(child) ? child.key : index}`;

export const childKey = (
  child: ReactNode,
  level: Level,
  index: number,
): string => level.keyed?.(child) ?? placeKey(child, level.prefix, index);

// A List holds a tree once any of its rows, in any Section, holds child ListItems.
export function holdsTree(
  children: readonly ReactNode[],
  sectionChildren: (child: ReactNode) => readonly ReactNode[] | undefined,
): boolean {
  return children.some((child) => {
    const section = sectionChildren(child);

    if (section) return holdsTree(section, sectionChildren);

    return childRows(child).length > 0;
  });
}

// Where a phone or narrow window draws the tree flat, every parent stays open: there is no chevron to unfold it.
const isOpen = (key: string, folding: TreeFolding): boolean =>
  !folding.drawn || !folding.folded.has(key);

/*
 * Each row with its child ListItems after it, open ones only, each holding its place in the tree. A parent loses its
 * children once they are rows of their own, so it never draws them twice.
 */
export function treeChildren(
  children: readonly ReactNode[],
  folding: TreeFolding,
  level: Level,
): TreeChild[] {
  return children.flatMap((child, index) =>
    treeChild(child, folding, {
      level,
      key: childKey(child, level, index),
      last: index === children.length - 1,
    }),
  );
}

function treeChild(
  child: ReactNode,
  folding: TreeFolding,
  place: Place,
): TreeChild[] {
  if (place.level.passes(child))
    return [{ child, key: place.key, content: child, nested: false }];

  return rowAndChildren(child, folding, place);
}

function rowAndChildren(
  child: ReactNode,
  folding: TreeFolding,
  place: Place,
): TreeChild[] {
  const rows = childRows(child);
  const tree = treeRow(rows, folding, place);
  const { key, level } = place;
  const content = keptContent(folding.kept, key, { child, tree, rows });
  const row: TreeChild = { child, key, content, nested: level.depth > 0 };

  if (!tree.parent?.open) return [row];

  return [row, ...treeChildren(rows, folding, nextLevel(tree, place.key))];
}

function treeRow(
  rows: readonly ReactNode[],
  folding: TreeFolding,
  { level, key, last }: Place,
): TreeRow {
  const parent =
    rows.length > 0
      ? { open: isOpen(key, folding), key, toggle: folding.toggle }
      : undefined;

  return { depth: level.depth, through: level.through, last, parent };
}

// Where a row sits in the tree, as one value: a row drawn in the same place draws as it did.
const placeOf = (
  key: string,
  { depth, last, parent, through }: TreeRow,
): string => [key, depth, last, parent?.open, ...through].join();

interface Drawn {
  child: ReactNode;
  tree: TreeRow;
  rows: readonly ReactNode[];
}

const keeps = (
  held: KeptContent | undefined,
  child: ReactNode,
  place: string,
): held is KeptContent =>
  held !== undefined && sameElement(held.child, child) && held.place === place;

const isObject = (value: unknown): value is object =>
  typeof value === 'object' && value !== null;

const propsOf = (node: ReactNode): object | undefined =>
  isValidElement(node) && isObject(node.props) ? node.props : undefined;

// The row's content as it was last drawn, while its element and place are the same; a new one otherwise.
function keptContent(kept: KeptContents, key: string, drawn: Drawn): ReactNode {
  const props = propsOf(drawn.child);
  const place = placeOf(key, drawn.tree);

  if (!props) return treeContent(drawn);

  const held = kept.get(props);

  if (keeps(held, drawn.child, place)) return held.content;

  const content = treeContent(drawn);

  kept.set(props, { child: drawn.child, place, content });

  return content;
}

function treeContent({ child, tree, rows }: Drawn): ReactNode {
  const own =
    rows.length > 0 && isValidElement<{ children?: ReactNode }>(child)
      ? cloneElement(child, { children: undefined })
      : child;

  return <ListTreeContext value={tree}>{own}</ListTreeContext>;
}

// A parent's children sit one level deeper, under the parent's key; a row never holds a Section.
function nextLevel(parent: TreeRow, key: string): Level {
  const { depth, through } = childTree(parent, false);

  return { prefix: key, depth, through, passes: () => false };
}

export const topLevel = (
  prefix: string,
  { passes, keyed }: Required<Pick<Level, 'passes' | 'keyed'>>,
): Level => ({ prefix, depth: 0, through: [], passes, keyed });
