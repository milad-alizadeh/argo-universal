import { cloneElement, isValidElement, type ReactNode } from 'react';
import {
  childRows,
  childTree,
  ListTreeContext,
  type TreeRow,
} from '../../../list-tree';

// How a List flattens its tree of ListItems: which parents are folded, and whether a wide window draws the tree at all.
export interface TreeFolding {
  folded: ReadonlySet<string>;
  toggle: (key: string) => void;
  drawn: boolean;
}

// One of a List's own children, or a child ListItem lifted out of its parent to a row of its own.
export interface TreeChild {
  child: ReactNode;
  key: string;
  content: ReactNode;
}

interface Level {
  prefix: string;
  depth: number;
  through: readonly boolean[];
  // A List.Section among a List's own children stays as it is; its rows are flattened with its own children.
  passes: (child: ReactNode) => boolean;
}

// Where one child sits among its siblings.
interface Place {
  level: Level;
  key: string;
  last: boolean;
}

const childKey = (child: ReactNode, prefix: string, index: number): string =>
  `${prefix}/${isValidElement(child) ? child.key : index}`;

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
      key: childKey(child, level.prefix, index),
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
    return [{ child, key: place.key, content: child }];

  return rowAndChildren(child, folding, place);
}

function rowAndChildren(
  child: ReactNode,
  folding: TreeFolding,
  place: Place,
): TreeChild[] {
  const rows = childRows(child);
  const tree = treeRow(rows, folding, place);

  const row: TreeChild = {
    child,
    key: place.key,
    content: treeContent(child, tree, rows),
  };

  if (!tree.parent?.open) return [row];

  return [row, ...treeChildren(rows, folding, nextLevel(tree, place.key))];
}

function treeRow(
  rows: readonly ReactNode[],
  folding: TreeFolding,
  { level, key, last }: Place,
): TreeRow {
  const toggle = (): void => folding.toggle(key);

  const parent =
    rows.length > 0 ? { open: isOpen(key, folding), toggle } : undefined;

  return { depth: level.depth, through: level.through, last, parent };
}

function treeContent(
  child: ReactNode,
  tree: TreeRow,
  rows: readonly ReactNode[],
): ReactNode {
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
  passes: (child: ReactNode) => boolean,
): Level => ({ prefix, depth: 0, through: [], passes });
