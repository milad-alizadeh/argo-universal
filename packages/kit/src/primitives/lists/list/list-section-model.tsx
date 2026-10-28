import type { ReactElement, ReactNode } from 'react';
import { flattenedChildren } from '../../../flattened-children';
import type { ListChild, ListReader } from './list-children';
import {
  isSection,
  levelEntries,
  placedChild,
  type Level,
  type ListTree,
  type PlacedChild,
} from './list-level-entries';
import type { MoveSection } from './list-move-model';
import { moveSectionsOf, rowTitles } from './list-move-reading';
import type { ListSectionProps } from './list-props';
import { prepareSection, type SectionState } from './list-section-state';
import { holdsTree, type TreeFolding } from './list-tree-rows';

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
  // The movable rows, Section by Section, in the owner's order, and their titles by id; none without `onMove`.
  sections: MoveSection[];
  titles: ReadonlyMap<string, string>;
}

// The order a List with `onMove` shows over its owner's: the owner's own, or a held move's.
export type ShownOrder = (owners: MoveSection[]) => readonly MoveSection[];

interface Pass {
  moves: boolean;
  // Each movable Section's rows in the order they show, and every movable row found by the owner's reading.
  held?: {
    sections: readonly MoveSection[];
    rows: ReadonlyMap<string, ReactNode>;
  };
}

type Read = Pick<ListReading, 'blocks'> & Pick<Level, 'rows'>;

const heldOrder = (held: Pass['held']): Level['held'] =>
  held && {
    order: new Map(held.sections.map((section) => [section.key, section.rows])),
    rows: held.rows,
  };

const topLevelOf = ({ prefix, tree }: ListReader, pass: Pass): Level => ({
  list: prefix,
  prefix,
  tree,
  held: heldOrder(pass.held),
  moves: pass.moves,
  movable: pass.moves,
  rows: new Map(),
  keys: new Set(),
});

function readOnce(children: ReactNode, reader: ListReader, pass: Pass): Read {
  const level = topLevelOf(reader, pass);

  return { blocks: readLevel(children, level), rows: level.rows };
}

// The owner's order, then the blocks again in the order shown when it differs.
function readMoving(
  children: ReactNode,
  reader: ListReader,
  shown: ShownOrder,
): ListReading {
  const owner = readOnce(children, reader, { moves: true });
  const sections = moveSectionsOf(owner.blocks, reader.prefix);
  const order = shown(sections);
  const held = { sections: order, rows: owner.rows };

  const blocks =
    order === sections
      ? owner.blocks
      : readOnce(children, reader, { moves: true, held }).blocks;

  return { blocks, sections, titles: rowTitles(owner.rows) };
}

/*
 * The one reader of a List's children: its rows and its Sections, keyed by where they sit. With `shown`, the List has
 * `onMove`: it reads every row's move identity and its owner's order, Section by Section, and draws the movable rows
 * in the order `shown` gives for it. A movable Section's key, its block's key and its rows' level are one and the same.
 */
export const readList = (
  children: ReactNode,
  reader: ListReader,
  shown?: ShownOrder,
): ListReading =>
  shown
    ? readMoving(children, reader, shown)
    : {
        blocks: readOnce(children, reader, { moves: false }).blocks,
        sections: [],
        titles: new Map(),
      };

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
    movable: level.moves && movable,
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

const looseRunKey = (previous: ListBlock | undefined): string =>
  `${previous?.key ?? 'start'}:items`;

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
