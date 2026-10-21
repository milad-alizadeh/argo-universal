import type { ReactElement, ReactNode } from 'react';
import { View } from 'react-native';
import { useSectionDrawing } from '../../../list-section-drawing';
import { useInMenu } from '../../../menu-rows-context';
import type { ListChild } from './list-children';
import type { ListBlock } from './list-section-model';
import { SectionContent, type SectionState } from './list-section-state';

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
    content: <SectionContent section={section}>{entry.content}</SectionContent>,
  }));
}

function partEntry(content: ReactNode, key: string): ListChild[] {
  return content ? [{ key, content, position: 'only', fullSpan: true }] : [];
}

// Paper's Combobox groups sit 8px apart; other lists use their section drawing.
function SectionGap(): ReactElement {
  const { below } = useSectionDrawing();

  return <View className={useInMenu() ? 'h-2' : below} />;
}

// The last popover group ends at the popover's own inset.
export function menuEntries(entries: ListChild[]): ListChild[] {
  return entries.at(-1)?.key.endsWith(':gap') ? entries.slice(0, -1) : entries;
}
