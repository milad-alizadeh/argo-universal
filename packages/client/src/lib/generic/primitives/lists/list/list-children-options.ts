import type { ListChild } from './list-children';
import type { ListProps } from './list-props';

export type ChildrenOptions = Omit<
  ListProps<ListChild>,
  | 'items'
  | 'renderItem'
  | 'getSectionKey'
  | 'keyExtractor'
  | 'getItemType'
  | 'maintainVisibleContentPosition'
>;

export function childrenOptions<Item>({
  items: _items,
  renderItem: _render,
  getSectionKey: _section,
  keyExtractor: _key,
  getItemType: _type,
  maintainVisibleContentPosition: _position,
  ...props
}: ListProps<Item>): ChildrenOptions {
  return props;
}
