import type { ReactNode } from 'react';
import type { ListSelection } from '../../../list-context';
import type { ListChild } from './list-children';
import { gatherLoose, sectionItems } from './list-section-entries';
import type { ListBlock } from './list-section-model';

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
