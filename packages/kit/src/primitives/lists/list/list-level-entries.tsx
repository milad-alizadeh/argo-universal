import { isValidElement, type ReactElement, type ReactNode } from 'react';
import { flattenedChildren } from '../../../flattened-children';
import { listPosition } from '../../../list-context';
import type { ListChild } from './list-children';
import { rowIdOf, type RowId } from './list-move-model';
import { refilled, type HeldOrder } from './list-move-reading';
import type { ListSectionProps } from './list-props';
import { renderedId } from './list-row-identity';
import { ListSection } from './list-section';
import {
  childKey,
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
  // The List's own key, which a moving row's and a Section's keys sit under wherever they draw.
  list: string;
  prefix: string;
  tree: ListTree;
  held: HeldOrder | undefined;
  // The List has `onMove`.
  moves: boolean;
  movable: boolean;
  // Every movable row's element, by id, as the reading finds it.
  rows: Map<RowId, ReactNode>;
  // Every key a Section or row took by its id, so a repeated id falls back to its place.
  keys: Set<string>;
}

export function isSection(
  child: ReactNode,
): child is ReactElement<ListSectionProps> {
  return isValidElement<ListSectionProps>(child) && child.type === ListSection;
}

// A row moves when it is a ListItem with an `id`, among the List's own rows or a Section's that has an id.
const movableId =
  (movable: boolean) =>
  (child: ReactNode): RowId | undefined =>
    movable && !isSection(child) ? rowIdOf(renderedId(child)) : undefined;

// The first child to take `key` keeps it; a later one keeps its place key.
function unique(
  keys: Set<string>,
  key: string | undefined,
): string | undefined {
  if (key === undefined || keys.has(key)) return undefined;

  keys.add(key);

  return key;
}

/*
 * In a List with `onMove`, a Section with an id and a row that moves keep one key wherever they draw, so a move never
 * draws them anew. Any other child is keyed by its place.
 */
function ownKey(level: Level): (child: ReactNode) => string | undefined {
  const idOf = movableId(level.movable);

  return (child) =>
    unique(
      level.keys,
      isSection(child)
        ? sectionKey(level, child)
        : rowKey(level.list, idOf(child)),
    );
}

const sectionKey = (
  { list, moves }: Level,
  section: ReactElement<ListSectionProps>,
): string | undefined =>
  moves && section.props.id !== undefined
    ? `${list}/section/${section.props.id}`
    : undefined;

const rowKey = (list: string, id: string | undefined): string | undefined =>
  id === undefined ? undefined : `${list}/row/${id}`;

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
  const top = topLevel(prefix, { passes: isSection, keyed: ownKey(level) });

  if (!tree.holds)
    return entries.map((child, index) => ({
      child,
      key: childKey(child, top, index),
      content: child,
      nested: false,
    }));

  return treeChildren(entries, tree.folding, top);
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
): RowId | undefined {
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
