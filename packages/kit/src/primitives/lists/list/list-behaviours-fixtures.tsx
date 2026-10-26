import { Text } from '#primitives/content/text';
import { ListItem } from '../list-item';
import type { ListProps } from './list-props';

const items = Array.from({ length: 40 }, (_, index) => `Item ${index + 1}`);

const row = (title: string): React.JSX.Element => (
  <ListItem id={title} title={title} />
);

export const pagedList = {
  items,
  renderItem: row,
  keyExtractor: (item: string): string => item,
  fit: false,
  accessibilityLabel: 'Paged items',
} satisfies ListProps<string>;

export const selectedList = {
  ...pagedList,
  items: items.slice(0, 4),
  selection: { mode: 'multiple', selected: ['Item 1', 'Item 2'] },
} satisfies ListProps<string>;

export const searchedList = {
  ...pagedList,
  searchMode: 'app',
} satisfies ListProps<string>;

export const logList = {
  ...pagedList,
  anchor: 'end',
  items: Array.from({ length: 120 }, (_, index) => `Item ${index + 1}`),
  renderItem: (line: string): React.JSX.Element => <Text>{line}</Text>,
  accessibilityLabel: 'Log lines',
} satisfies ListProps<string>;

// Already holds every row the example's pagination will load, so `hasMore` is false.
export const completeList = {
  ...pagedList,
  items: Array.from({ length: 60 }, (_, index) => `Item ${index + 1}`),
} satisfies ListProps<string>;

export const refreshableList = {
  ...pagedList,
  items: items.slice(0, 4),
  onRefresh: (): void => {},
} satisfies ListProps<string>;
