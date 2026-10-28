import type { ReactNode } from 'react';
import type { ListSelection } from '../../../list-context';
import type { ListChild } from './list-children';
import { sectionItems } from './list-section-entries';
import type { ListBlock } from './list-section-model';

export interface Lane {
  key: string;
  // The Section's id; none for rows outside any Section.
  id?: string;
  header: ReactNode;
  footer: ReactNode;
  items: ListChild[];
  selection: ListSelection;
}

type SectionBlock = Exclude<ListBlock, { kind: 'items' }>;

// Rows outside any Section: a lane without a header.
const looseLane = (key: string, items: ListChild[]): Lane => ({
  key,
  header: null,
  footer: null,
  items,
  selection: {},
});

const sectionLane = ({ key, section, blocks }: SectionBlock): Lane => ({
  key,
  id: section.id,
  header: section.header,
  footer: section.footer,
  items: sectionItems(blocks, section),
  selection: section.selection,
});

export const lanesOf = (blocks: readonly ListBlock[]): Lane[] =>
  blocks.map((block) =>
    block.kind === 'items'
      ? looseLane(block.key, block.items)
      : sectionLane(block),
  );
