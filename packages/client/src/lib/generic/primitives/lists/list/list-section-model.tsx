import { isValidElement, type ReactElement, type ReactNode } from 'react';
import { flattenedChildren } from '../../../flattened-children';
import { listPosition } from '../../../list-context';
import type { ListChild } from './list-children';
import type { ListSectionProps } from './list-props';
import { ListSection } from './list-section';
import { prepareSection, type SectionState } from './list-section-state';

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

export function prepareChildren(
  children: ReactNode,
  prefix: string,
): ListBlock[] {
  const blocks: ListBlock[] = [];
  const entries = flattenedChildren(children);

  for (const [index, child] of entries.entries()) {
    appendChild(
      blocks,
      child,
      childEntry(child, { prefix, index, count: entries.length }),
    );
  }

  return blocks;
}

function isSection(child: ReactNode): child is ReactElement<ListSectionProps> {
  return isValidElement<ListSectionProps>(child) && child.type === ListSection;
}

function appendChild(
  blocks: ListBlock[],
  child: ReactNode,
  entry: ListChild,
): void {
  if (isSection(child)) {
    const section = prepareSection(child.props, entry.key);

    blocks.push({
      key: entry.key,
      kind: 'section',
      section,
      blocks: prepareChildren(section.children, entry.key),
    });
  } else appendItem(blocks, entry);
}

function appendItem(blocks: ListBlock[], entry: ListChild): void {
  const previous = blocks.at(-1);

  if (previous?.kind === 'items') previous.items.push(entry);
  else blocks.push({ key: entry.key, kind: 'items', items: [entry] });
}

function childEntry(
  child: ReactNode,
  place: { prefix: string; index: number; count: number },
): ListChild {
  return {
    key: `${place.prefix}/${isValidElement(child) ? child.key : place.index}`,
    content: child,
    position: listPosition(place.index === 0, place.index === place.count - 1),
  };
}
