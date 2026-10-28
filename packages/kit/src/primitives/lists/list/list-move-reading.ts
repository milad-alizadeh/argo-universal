import { isValidElement, type ReactNode } from 'react';
import type { ListChild } from './list-children';
import { sectionKey, type MoveSection } from './list-move-model';
import { gatherLoose } from './list-section-entries';
import type { ListBlock } from './list-section-model';

// A move the List shows before its owner answers: each movable Section's rows in the moved order, and every movable row.
export interface HeldOrder {
  order: ReadonlyMap<string, readonly string[]>;
  rows: ReadonlyMap<string, ReactNode>;
}

// One level's movable rows in a held move's order.
interface LevelOrder {
  order: readonly string[];
  rows: ReadonlyMap<string, ReactNode>;
}

type MovableId = (child: ReactNode) => string | undefined;

// Each movable child's slot takes the next of `next`; slots past its end are dropped.
function slotted(
  children: readonly ReactNode[],
  next: readonly ReactNode[],
  movableId: MovableId,
): ReactNode[] {
  let taken = 0;

  return children.flatMap((child) => {
    if (movableId(child) === undefined) return [child];

    taken += 1;

    return next[taken - 1] ?? [];
  });
}

/*
 * One level's children with its movable rows in `order`: each movable child's slot takes the next row in the order,
 * rows the order adds go after the last child, and rows it leaves out are dropped.
 */
export function refilled(
  children: readonly ReactNode[],
  { order, rows }: LevelOrder,
  movableId: MovableId,
): ReactNode[] {
  const next = order.flatMap((id) => rows.get(id) ?? []);
  const slots = children.filter((child) => movableId(child) !== undefined);

  return [...slotted(children, next, movableId), ...next.slice(slots.length)];
}

// A movable row's title, as its ListItem draws it; a row without a text title has none.
function titleOf(row: ReactNode): string[] {
  if (!isValidElement<{ title?: unknown }>(row)) return [];

  const { title } = row.props;

  return typeof title === 'string' ? [title] : [];
}

// Every movable row's title, by id, for the Move to… picker to name the rows it places after.
export const rowTitles = (
  rows: ReadonlyMap<string, ReactNode>,
): ReadonlyMap<string, string> =>
  new Map(
    [...rows].flatMap(([id, row]) =>
      titleOf(row).map((title): [string, string] => [id, title]),
    ),
  );

const movableIds = (items: readonly ListChild[]): string[] =>
  items.flatMap((item) => item.moveId ?? []);

const sectionRows = (blocks: readonly ListBlock[]): string[] =>
  blocks.flatMap((block) =>
    block.kind === 'items' ? movableIds(block.items) : [],
  );

function sectionOf(block: ListBlock): MoveSection[] {
  if (block.kind === 'items' || block.section.id === undefined) return [];

  const { key, section } = block;

  return [
    {
      key: sectionKey(key),
      id: section.id,
      title: section.title,
      rows: sectionRows(block.blocks),
    },
  ];
}

const holdsLoose = (block: ListBlock): boolean =>
  block.kind === 'items' && movableIds(block.items).length > 0;

// The List's movable rows, Section by Section, read from the blocks it draws; the rows outside any Section are one Section, keyed `looseKey`.
export const moveSectionsOf = (
  blocks: readonly ListBlock[],
  looseKey: string,
): MoveSection[] =>
  gatherLoose(blocks, {
    holds: holdsLoose,
    loose: { key: sectionKey(looseKey), rows: sectionRows(blocks) },
    each: sectionOf,
  });
