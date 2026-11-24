import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { Profiler, useState } from 'react';
import { View } from 'react-native';
import { expect } from 'storybook/test';
import { renderCounter } from '#mocks/render-counts';
import { settleLayout } from '#mocks/story-layout';
import { Button } from '#primitives/actions/button';
import { List } from '../list';
import { ListItem } from '../list-item';
import type { ListEntry } from './list-entries';

const meta = {
  title: 'Tests/Design System/Primitives/Lists/List/Entries',
  component: List,
  parameters: { screenPreview: true },
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

interface Row {
  id: string;
  title: string;
}

const row = (id: string, title = `Row ${id}`): Row => ({ id, title });

const entryOf = (item: Row): ListEntry<Row> => ({ key: item.id, item });

const fruit = [row('apple', 'Apple'), row('pear', 'Pear')];

const veg = [row('leek', 'Leek'), row('kale', 'Kale')];

const entries = (
  first: readonly Row[],
  second: readonly Row[],
): ListEntry<Row>[] => [
  {
    key: 'fruit',
    section: { title: 'Fruit', collapsible: true },
    entries: first.map(entryOf),
  },
  {
    key: 'veg',
    section: { title: 'Vegetables' },
    entries: second.map(entryOf),
  },
];

// As the App keeps what it drew for a row it did not change (its Plugin renderer's drawn nodes), a row keeps its element.
const drawn = new WeakMap<Row, React.JSX.Element>();

function drawRow(item: Row): React.JSX.Element {
  const kept = drawn.get(item);

  if (kept) return kept;

  const element = <ListItem key={item.id} id={item.id} title={item.title} />;
  drawn.set(item, element);

  return element;
}

const renders = renderCounter();

function Sectioned({
  next,
  searchMode,
}: {
  next?: readonly Row[];
  searchMode?: 'app';
}): React.JSX.Element {
  const [changed, change] = useState(false);

  return (
    <View style={{ flex: 1 }}>
      <Button label="Change row" onPress={() => change(true)} />
      <Profiler id={renders.id} onRender={renders.onRender}>
        <View style={{ height: 600 }}>
          <List
            accessibilityLabel="Produce"
            searchMode={searchMode}
            entries={entries(changed && next ? next : fruit, veg)}
            renderEntry={drawRow}
          />
        </View>
      </Profiler>
    </View>
  );
}

// Entries stand for the Sections and rows their children would spell.
export const SectionsAndRows: Story = {
  render: () => <Sectioned />,
  play: async ({ canvas, userEvent }) => {
    await settleLayout('wide');
    await canvas.findByText('Fruit');
    await expect(canvas.getByText('Vegetables')).toBeVisible();
    await expect(canvas.getByText('Apple')).toBeVisible();
    await expect(canvas.getByText('Kale')).toBeVisible();

    await userEvent.click(canvas.getByRole('button', { name: /Fruit/ }));

    await expect(canvas.queryByText('Apple')).toBeNull();
    await expect(canvas.getByText('Leek')).toBeVisible();
  },
};

// A search keeps the Section of each row it matches, and drops the Sections it matches none of.
export const SearchKeepsMatchingSections: Story = {
  render: () => <Sectioned searchMode="app" />,
  play: async ({ canvas, userEvent }) => {
    await settleLayout('wide');
    await userEvent.type(await canvas.findByLabelText('Search'), 'kale');

    await expect(canvas.getByText('Vegetables')).toBeVisible();
    await expect(canvas.getByText('Kale')).toBeVisible();
    await expect(canvas.queryByText('Fruit')).toBeNull();
    await expect(canvas.queryByText('Leek')).toBeNull();
  },
};

// A change to one row draws that row alone; every other row keeps the element it was.
export const ChangedRowDrawsAlone: Story = {
  render: () => (
    <Sectioned next={[fruit[0] ?? row('apple'), row('pear', 'Pear changed')]} />
  ),
  play: async ({ canvas, canvasElement, userEvent }) => {
    await settleLayout('wide');
    await canvas.findByText('Pear');

    const counts = await renders.during(canvasElement, async () => {
      await userEvent.click(canvas.getByRole('button', { name: 'Change row' }));
      await canvas.findByText('Pear changed');
    });

    await expect(counts.ListItem?.updates).toHaveLength(1);
    await expect(counts.ListItem).toHaveProperty('mounts', 0);
  },
};
