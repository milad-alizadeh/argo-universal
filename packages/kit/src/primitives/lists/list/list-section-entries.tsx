import type { ReactElement, ReactNode } from 'react';
import { View } from 'react-native';
import type { ListSelection } from '../../../list-context';
import { useListLook } from '../../../list-look-context';
import type { ListChild } from './list-children';
import type { ListBlock } from './list-section-model';
import type { SectionState } from './list-section-state';

interface Gathered<Entry> {
  // Whether a block's rows count as the rows outside any Section.
  holds: (block: ListBlock) => boolean;
  // The rows outside any Section, as one entry.
  loose: Entry;
  each: (block: ListBlock) => Entry[];
}

/*
 * Each block's entries in order, with the rows outside any Section gathered into one entry where the first of them
 * sits, however many Sections split them.
 */
export function gatherLoose<Entry>(
  blocks: readonly ListBlock[],
  { holds, loose, each }: Gathered<Entry>,
): Entry[] {
  const first = blocks.findIndex(holds);

  return blocks.flatMap((block, index) =>
    index === first ? [loose, ...each(block)] : each(block),
  );
}

// Rows and grids flatten only at their drawing; shelves consume the blocks directly.
export function sectionEntries(blocks: readonly ListBlock[]): ListChild[] {
  return blocks.flatMap(blockEntries);
}

function blockEntries(block: ListBlock): ListChild[] {
  if (block.kind === 'items') return block.items;

  return [
    ...partEntry(block.section.header, `${block.key}:header`),
    ...sectionItems(block.blocks, block.section),
    ...partEntry(block.section.footer, `${block.key}:footer`),
    ...partEntry(<SectionGap />, `${block.key}:gap`),
  ];
}

export function sectionItems(
  blocks: readonly ListBlock[],
  section: SectionState,
): ListChild[] {
  return sectionEntries(blocks).map((entry) => ({
    ...entry,
    ...section.selection,
    content: entry.content,
  }));
}

function partEntry(content: ReactNode, key: string): ListChild[] {
  return content ? [{ key, content, position: 'only', fullSpan: true }] : [];
}

// Paper's Combobox groups sit 8px apart; other lists use their section drawing.
function SectionGap(): ReactElement {
  const { menu, section } = useListLook();

  return <View className={menu ? 'h-2' : section.below} />;
}

// The last popover group ends at the popover's own inset.
export function menuEntries(entries: ListChild[]): ListChild[] {
  return entries.at(-1)?.key.endsWith(':gap') ? entries.slice(0, -1) : entries;
}

// A lane's `key` is its Section's key, as the List's moves name it.
export interface Lane {
  key: string;
  // The Section's title, which names its lane for a screen reader; none for rows outside any Section.
  title: string | undefined;
  header: ReactNode;
  footer: ReactNode;
  items: ListChild[];
  selection: ListSelection;
}

type SectionBlock = Exclude<ListBlock, { kind: 'items' }>;

// Rows outside any Section: a lane without a header.
const looseLane = (key: string, items: ListChild[]): Lane => ({
  key,
  title: undefined,
  header: null,
  footer: null,
  items,
  selection: {},
});

const sectionLane = ({ key, section, blocks }: SectionBlock): Lane => ({
  key,
  title: section.title,
  header: section.header,
  footer: section.footer,
  items: sectionItems(blocks, section),
  selection: section.selection,
});

const looseItems = (blocks: readonly ListBlock[]): ListChild[] =>
  blocks.flatMap((block) => (block.kind === 'items' ? block.items : []));

const laneOf = (block: ListBlock): Lane[] =>
  block.kind === 'section' ? [sectionLane(block)] : [];

// Each Section a lane, in order; the rows outside any Section are one lane, keyed `looseKey`.
export const lanesOf = (
  blocks: readonly ListBlock[],
  looseKey: string,
): Lane[] =>
  gatherLoose(blocks, {
    holds: (block) => block.kind === 'items',
    loose: looseLane(looseKey, looseItems(blocks)),
    each: laneOf,
  });
