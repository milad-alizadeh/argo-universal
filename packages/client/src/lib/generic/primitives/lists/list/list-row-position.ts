import { listPosition, type ListPosition } from '../../../list-context';
import type { ListProps } from './list-props';

function neighborSection<Item>(
  item: Item | undefined,
  getKey: (item: Item) => string | undefined,
): string | undefined {
  return item === undefined ? undefined : getKey(item);
}

function differentSection<Item>(
  props: ListProps<Item>,
  index: number,
  neighbor: number,
): boolean {
  const { items = [], getSectionKey } = props;

  if (!getSectionKey) return false;

  return (
    neighborSection(items[index], getSectionKey) !==
    neighborSection(items[neighbor], getSectionKey)
  );
}

function startsSection<Item>(props: ListProps<Item>, index: number): boolean {
  return index === 0 || differentSection(props, index, index - 1);
}

function endsSection<Item>(props: ListProps<Item>, index: number): boolean {
  const { items = [] } = props;

  return (
    index === items.length - 1 || differentSection(props, index, index + 1)
  );
}

export function dataRowPosition<Item>(
  props: ListProps<Item>,
  index: number,
): ListPosition {
  return listPosition(startsSection(props, index), endsSection(props, index));
}

export const rowPosition = (index: number, count: number): ListPosition =>
  listPosition(index === 0, index === count - 1);
