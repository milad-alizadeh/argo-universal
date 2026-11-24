import { createElement, type ReactNode } from 'react';
import { flatChildren } from '../../../flattened-children';
import type { ListSectionProps } from './list-props';
import { ListSection } from './list-section';

/*
 * A List's rows and Sections as data: the structure its children would spell, held as fields. A row is an `item` the
 * List's `renderItem` draws; a Section holds its own props and the entries of its rows. Each `key` is unique among its
 * siblings.
 */
export type ListEntry<Item> = RowEntry<Item> | SectionEntry<Item>;

interface RowEntry<Item> {
  key: string;
  item: Item;
}

interface SectionEntry<Item> {
  key: string;
  section: Omit<ListSectionProps, 'children'>;
  entries: readonly ListEntry<Item>[];
}

const isSection = <Item,>(
  entry: ListEntry<Item>,
): entry is SectionEntry<Item> => 'section' in entry;

/*
 * The nodes a List reads for `entries`: a row is what `renderItem` draws for it, which carries its own key, and a
 * Section is a `List.Section` over its rows' nodes.
 */
export function entryNodes<Item>(
  entries: readonly ListEntry<Item>[],
  renderItem: (item: Item, index: number) => ReactNode,
): ReactNode[] {
  return entries.map((entry, index) =>
    isSection(entry)
      ? createElement(
          ListSection,
          { ...entry.section, key: entry.key },
          flatChildren(entryNodes(entry.entries, renderItem)),
        )
      : renderItem(entry.item, index),
  );
}
