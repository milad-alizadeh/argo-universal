import { List } from '@repo/kit/primitives/lists/list';
import type { ReactElement } from 'react';
import { View } from 'react-native';

// Both work lists keep source order within their active and completed sections.
export function workListSections<Item>(
  items: Item[],
  isActive: (item: Item) => boolean,
  row: (item: Item) => ReactElement,
): ReactElement[] {
  return [true, false].flatMap((active) => {
    const members = items.filter((item) => isActive(item) === active);

    return members.length ? [workSection(active, members.map(row))] : [];
  });
}

function workSection(active: boolean, rows: ReactElement[]): ReactElement {
  const title = active ? 'Running' : 'Done';

  return (
    <List.Section
      key={title}
      title={title}
      count={rows.length}
      leading={<View className="w-10 wide-type:w-8 wide:w-7" />}
    >
      {rows}
    </List.Section>
  );
}
