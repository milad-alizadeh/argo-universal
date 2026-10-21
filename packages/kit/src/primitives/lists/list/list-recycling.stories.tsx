import type { LegendListRef } from '@legendapp/list/react-native';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import {
  useRef,
  useState,
  type Dispatch,
  type RefObject,
  type SetStateAction,
} from 'react';
import { View } from 'react-native';
import { kitArgTypes } from '#kit/kit-arg-types';
import { Button } from '#primitives/actions/button';
import { ListItem } from '#primitives/lists/list-item';
import { List } from './list';
import type { ListProps } from './list-props';
import { recyclingList } from './list-recycling-fixtures';

const meta = {
  title: 'Design System/Primitives/Lists/List/Recycling',
  component: List,
  argTypes: kitArgTypes('List'),
  parameters: { screenPreview: true },
} satisfies Meta<typeof List>;

export default meta;

const rows = Array.from({ length: 80 }, (_, index) => ({
  id: `row-${index + 1}`,
  title: `Row ${index + 1}`,
  description: index % 4 === 0 ? `Description ${index + 1}` : undefined,
}));

type Row = (typeof rows)[number];

type ListRef = RefObject<LegendListRef | null>;

type ChangeRows = Dispatch<SetStateAction<Row[]>>;

const recycleProps = {
  ...recyclingList,
  keyExtractor: (item): string => item.id,
  renderItem: (item): React.JSX.Element => (
    <ListItem title={item.title} description={item.description} />
  ),
} satisfies Partial<ListProps<Row>>;

function RecyclingList(): React.JSX.Element {
  const list = useRef<LegendListRef>(null);
  const [items, setItems] = useState(rows);

  return (
    <View className="flex-1">
      <ScrollControls list={list} />
      <MutationControls change={setItems} />
      <List ref={list} items={items} {...recycleProps} />
    </View>
  );
}

function ScrollControls({ list }: { list: ListRef }): React.JSX.Element {
  return (
    <View className="flex-row flex-wrap gap-2">
      <Button
        label="First rows"
        onPress={() => scrollToEdge(list.current, false)}
      />
      <Button
        label="Last rows"
        onPress={() => scrollToEdge(list.current, true)}
      />
    </View>
  );
}

function scrollToEdge(list: LegendListRef | null, end: boolean): void {
  if (!list) return;

  if (end) {
    void list.scrollToEnd({ animated: false });

    return;
  }

  void list.scrollToIndex({ index: 0, animated: false });
}

function MutationControls({
  change,
}: {
  change: ChangeRows;
}): React.JSX.Element {
  const reverse = (): void => change((current) => current.toReversed());

  const remove = (): void =>
    change((current) => current.filter(({ id }) => id !== 'row-1'));

  return (
    <View className="flex-row flex-wrap gap-2">
      <Button label="Reverse rows" onPress={reverse} />
      <Button label="Remove described row" onPress={remove} />
    </View>
  );
}

export const Recycling: StoryObj<typeof meta> = {
  render: () => <RecyclingList />,
};
