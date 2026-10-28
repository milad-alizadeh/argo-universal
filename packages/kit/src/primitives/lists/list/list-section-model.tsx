import type { ReactElement, ReactNode } from 'react';
import { flattenedChildren } from '../../../flattened-children';
import type { ListChild } from './list-children';
import {
  isSection,
  levelEntries,
  placedChild,
  type Level,
  type ListTree,
  type PlacedChild,
} from './list-level-entries';
import type { HeldOrder } from './list-move-reading';
import type { ListSectionProps } from './list-props';
import { prepareSection, type SectionState } from './list-section-state';
import { holdsTree, type TreeFolding } from './list-tree-rows';

export type { ListTree };

export type ListBlock = ItemBlock | SectionBlock;

interface ItemBlock {
  key: string;
  kind: 'items';
  items: ListChild[];
}

interface SectionBlock {
  key: string;
  kind: 'section';
  section: SectionState;
  blocks: ListBlock[];
}

const sectionChildren = (child: ReactNode): ReactNode[] | undefined =>
  isSection(child) ? flattenedChildren(child.props.children) : undefined;

export function listTree(
  children: ReactNode,
  folding: TreeFolding,
  footerShown: boolean,
): ListTree {
  return {
    folding,
    footerShown,
    holds: holdsTree(flattenedChildren(children), sectionChildren),
  };
}

function readLevel(children: ReactNode, level: Level): ListBlock[] {
  const blocks: ListBlock[] = [];
  const entries = levelEntries(children, level);

  for (const [index, entry] of entries.entries())
    appendChild(
      blocks,
      placedChild(entry, { index, count: entries.length, level }),
      level,
    );

  return blocks;
}

export interface ListReading {
  blocks: ListBlock[];
  rows: ReadonlyMap<string, ReactNode>;
}

interface Reader {
  prefix: string;
  tree: ListTree;
  held: HeldOrder | undefined;
}

/*
 * The one reader of a List's children: its rows, its Sections and every row's move identity, keyed by where it sits.
 * A move the List holds is read into the order: each movable Section's rows in the moved order.
 */
export function readList(
  children: ReactNode,
  { prefix, tree, held }: Reader,
): ListReading {
  const rows = new Map<string, ReactNode>();
  const level = { prefix, tree, held, movable: true, rows };

  return { blocks: readLevel(children, level), rows };
}

function appendChild(
  blocks: ListBlock[],
  { child, entry }: PlacedChild,
  level: Level,
): void {
  if (isSection(child)) blocks.push(sectionBlock(child, entry.key, level));
  else appendItem(blocks, entry);
}

function sectionLevel(level: Level, key: string, section: SectionState): Level {
  const movable = section.id !== undefined;

  return {
    ...level,
    prefix: key,
    movable,
    held: movable ? level.held : undefined,
  };
}

// A Section's rows read one level down, under its key; only a Section with an id names where its rows land.
function sectionBlock(
  child: ReactElement<ListSectionProps>,
  key: string,
  level: Level,
): SectionBlock {
  const section = prepareSection(child.props, key, level.tree.footerShown);
  const blocks = readLevel(section.children, sectionLevel(level, key, section));

  return { key, kind: 'section', section, blocks };
}

function appendItem(blocks: ListBlock[], entry: ListChild): void {
  const previous = blocks.at(-1);

  if (previous?.kind === 'items') previous.items.push(entry);
  else
    blocks.push({
      key: looseRunKey(previous),
      kind: 'items',
      items: [entry],
    });
}

function looseRunKey(previous: ListBlock | undefined): string {
  return `${previous?.key ?? 'start'}:items`;
}
