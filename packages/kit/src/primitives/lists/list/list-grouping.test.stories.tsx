import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { useState } from 'react';
import { View } from 'react-native';
import { expect } from 'storybook/test';
import { settleLayout, type LayoutName } from '#mocks/story-layout';
import { Text } from '#primitives/content/text';
import { ListItem } from '../list-item';
import { List } from './list';
import { Recycling } from './list-recycling.stories';

const meta = {
  title: 'Tests/Design System/Primitives/Lists/List/Grouping',
  component: List,
  parameters: { screenPreview: true },
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

const firstDescription = 'First description';

const rowDescription = 'Description 1';

function ReorderedSelection(): React.JSX.Element {
  const [reversed, reverse] = useState(false);
  const [removed, remove] = useState(false);
  const [selection, onSelectionChange] = useState<readonly string[]>(['first']);
  const rows = reversed ? ['second', 'first'] : ['first', 'second'];

  return (
    <List>
      <ListItem title="Reverse rows" onPress={() => reverse(!reversed)} />
      <ListItem title="Remove described row" onPress={() => remove(true)} />
      <List.Section
        title="Choices"
        selectionMode="multiple"
        selection={selection}
        onSelectionChange={onSelectionChange}
      >
        {rows
          .filter((id) => !removed || id !== 'first')
          .map((id) => (
            <ListItem
              key={id}
              id={id}
              title={id}
              description={id === 'first' ? firstDescription : undefined}
            />
          ))}
      </List.Section>
      <Text>{selection.join(',')}</Text>
    </List>
  );
}

function reordering(layout: LayoutName): Story {
  return {
    render: () => <ReorderedSelection />,
    play: async ({ canvas, userEvent }) => {
      await settleLayout(layout);
      await userEvent.click(
        await canvas.findByRole('button', { name: 'Reverse rows' }),
      );
      await userEvent.click(
        await canvas.findByRole('button', { name: 'second' }),
      );
      await expect(canvas.getByText('first,second')).toBeVisible();
      await expect(canvas.getByText(firstDescription)).toBeVisible();
      await userEvent.click(
        canvas.getByRole('button', { name: 'Remove described row' }),
      );
      await expect(canvas.queryByText(firstDescription)).toBeNull();
      await expect(canvas.queryByRole('button', { name: 'first' })).toBeNull();
      await userEvent.click(canvas.getByRole('button', { name: 'second' }));
      await expect(canvas.getByText('first')).toBeVisible();
    },
  };
}

export const ReorderAndRemoveWide = reordering('wide');

export const ReorderAndRemovePhone = reordering('phone');

export const RecycleDescribedRows: Story = {
  ...Recycling,
  play: async ({ canvas, userEvent }) => {
    await settleLayout('phone');
    await expect(await canvas.findByText(rowDescription)).toBeVisible();
    await userEvent.click(canvas.getByRole('button', { name: 'Last rows' }));
    await expect(await canvas.findByText('Row 80')).toBeVisible();
    await expect(canvas.queryByText(rowDescription)).toBeNull();
    await userEvent.click(canvas.getByRole('button', { name: 'First rows' }));
    await expect(await canvas.findByText(rowDescription)).toBeVisible();
    await userEvent.click(canvas.getByRole('button', { name: 'Reverse rows' }));
    await expect(await canvas.findByText('Row 80')).toBeVisible();
    await userEvent.click(canvas.getByRole('button', { name: 'Last rows' }));
    await expect(await canvas.findByText(rowDescription)).toBeVisible();
    await userEvent.click(
      canvas.getByRole('button', { name: 'Remove described row' }),
    );
    await expect(canvas.queryByText(rowDescription)).toBeNull();
    await expect(canvas.queryByText('Row 1')).toBeNull();
    await expect(await canvas.findByText('Row 2')).toBeVisible();
  },
};

const firstSelected = 'Selected: first';

function InheritedSection(): React.JSX.Element {
  const [selection, onSelectionChange] = useState<readonly string[]>(['first']);

  return (
    <View>
      <List.Section
        selectionMode="single"
        selection={selection}
        onSelectionChange={onSelectionChange}
      >
        <List.Section title="Nested choices">
          <ListItem id="first" title="First choice" />
          <ListItem id="second" title="Second choice" />
        </List.Section>
      </List.Section>
      <Text>{`Selected: ${selection.join(',')}`}</Text>
    </View>
  );
}

export const StandaloneSelectionInheritance: Story = {
  render: () => <InheritedSection />,
  play: async ({ canvas, userEvent }) => {
    await settleLayout('wide');
    await expect(canvas.getByText(firstSelected)).toBeVisible();
    await userEvent.click(
      await canvas.findByRole('button', { name: 'Second choice' }),
    );
    await expect(canvas.getByText('Selected: second')).toBeVisible();
    await expect(canvas.queryByText(firstSelected)).toBeNull();
  },
};

const dataRows = ['first', 'second'];

// A List of data rows inside a choosing section chooses nothing for that section: its rows keep their own presses.
function DataRowsInChoosingSection(): React.JSX.Element {
  const [selection, onSelectionChange] = useState<readonly string[]>(['first']);
  const [pressed, press] = useState<string>();

  return (
    <View className="flex-1">
      <List.Section
        selectionMode="single"
        selection={selection}
        onSelectionChange={onSelectionChange}
      >
        <View className="h-40">
          <List
            items={dataRows}
            keyExtractor={(id) => id}
            renderItem={(id) => (
              <ListItem
                id={id}
                title={`Data ${id}`}
                onPress={() => press(id)}
              />
            )}
          />
        </View>
      </List.Section>
      <Text>{`Selected: ${selection.join(',')}`}</Text>
      <Text>{`Pressed: ${pressed ?? 'none'}`}</Text>
    </View>
  );
}

export const DataRowsClearInheritedSelection: Story = {
  render: () => <DataRowsInChoosingSection />,
  play: async ({ canvas, userEvent }) => {
    await settleLayout('wide');
    await userEvent.click(
      await canvas.findByRole('button', { name: 'Data second' }),
    );
    await expect(canvas.getByText('Pressed: second')).toBeVisible();
    await expect(canvas.getByText(firstSelected)).toBeVisible();
    await expect(canvas.queryByText('Selected: second')).toBeNull();
  },
};
