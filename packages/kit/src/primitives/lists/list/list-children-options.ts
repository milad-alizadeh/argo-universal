import type { ListChild } from './list-children';
import type { ListProps } from './list-props';

export type ChildrenOptions = Omit<
  ListProps<ListChild>,
  | 'items'
  | 'entries'
  | 'renderEntry'
  | 'renderItem'
  | 'getSelectionId'
  | 'getSectionKey'
  | 'keyExtractor'
  | 'getItemType'
  | 'getFixedItemSize'
  | 'maintainVisibleContentPosition'
>;

export function childrenOptions<Item>({
  items: _items,
  entries: _entries,
  renderEntry: _renderEntry,
  renderItem: _render,
  getSectionKey: _section,
  getSelectionId: _selection,
  keyExtractor: _key,
  getItemType: _type,
  getFixedItemSize: _size,
  maintainVisibleContentPosition: _position,
  ...props
}: ListProps<Item>): ChildrenOptions {
  return props;
}
