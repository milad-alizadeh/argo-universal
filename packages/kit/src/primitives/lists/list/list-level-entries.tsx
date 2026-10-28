import { isValidElement, type ReactElement, type ReactNode } from 'react';
import { flattenedChildren } from '../../../flattened-children';
import { listPosition } from '../../../list-context';
import type { ListChild } from './list-children';
import { refilled, type HeldOrder } from './list-move-reading';
import type { ListSectionProps } from './list-props';
import { rowIdOf } from './list-row-id';
import { ListSection } from './list-section';
import {
  topLevel,
  treeChildren,
  type TreeChild,
  type TreeFolding,
} from './list-tree-rows';

// How a List's rows fold, and whether it holds a tree at all; a List without one draws its children as they are.
export interface ListTree {
  folding: TreeFolding;
  holds: boolean;
  // A section's footer is drawn; Android puts the description on the row instead.
  footerShown: boolean;
}

// How the List reads one level of its children: its tree, a move it holds, and whether this level's rows move.
export interface Level {
  prefix: string;
  tree: ListTree;
  held: HeldOrder | undefined;
  movable: boolean;
  // Every movable row's element, by id, as the reading finds it.
  rows: Map<string, ReactNode>;
}

export function isSection(
  child: ReactNode,
): child is ReactElement<ListSectionProps> {
  return isValidElement<ListSectionProps>(child) && child.type === ListSection;
}

// A row moves when it is a ListItem with an `id`, among the List's own rows or a Section's that has an id.
const movableId =
  (movable: boolean) =>
  (child: ReactNode): string | undefined =>
    movable && !isSection(child) ? rowIdOf(child) : undefined;

// A held move reads this level's movable rows in its order; a level whose rows cannot move holds none.
function heldEntries(entries: ReactNode[], level: Level): ReactNode[] {
  const { held, prefix, movable } = level;

  if (!held) return entries;

  const order = held.order.get(prefix) ?? [];

  return refilled(entries, { order, rows: held.rows }, movableId(movable));
}

// A List's children in order, each child ListItem lifted to a row of its own after its parent.
export function levelEntries(children: ReactNode, level: Level): TreeChild[] {
  const entries = heldEntries(flattenedChildren(children), level);
  const { prefix, tree } = level;

  if (!tree.holds)
    return entries.map((child, index) => ({
      child,
      key: `${prefix}/${isValidElement(child) ? child.key : index}`,
      content: child,
      nested: false,
    }));

  return treeChildren(entries, tree.folding, topLevel(prefix, isSection));
}

// A child in its List's order: the node itself, and the entry the List draws for it.
export interface PlacedChild {
  child: ReactNode;
  entry: ListChild;
}

export interface Placing {
  index: number;
  count: number;
  level: Level;
}

// A row lifted out of its parent moves with it; any other movable row is found by its id.
function foundRow(
  { child, nested }: TreeChild,
  level: Level,
): string | undefined {
  const id = nested ? undefined : movableId(level.movable)(child);

  if (id !== undefined) level.rows.set(id, child);

  return id;
}

export function placedChild(
  treeChild: TreeChild,
  { index, count, level }: Placing,
): PlacedChild {
  const { child, key, content } = treeChild;
  const position = listPosition(index === 0, index === count - 1);
  const entry: ListChild = { key, content, position };
  const moveId = foundRow(treeChild, level);

  if (moveId !== undefined) entry.moveId = moveId;

  return { child, entry };
}
