import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { useState } from 'react';
import { expect } from 'storybook/test';
import { Icon } from '#primitives/content/icon';
import { Text } from '#primitives/content/text';
import { ListItem } from '../list-item';
import { List } from './list';
import presentationMeta, { Grouped, Plain } from './list.stories';

const meta = {
  ...presentationMeta,
  title: 'Tests/Design System/Primitives/Lists/List',
  parameters: { screenPreview: true },
} satisfies Meta;

export default meta;

type Story = StoryObj;

export const Empty: Story = {
  render: () => (
    <List items={[]} renderItem={() => null} empty={<Text>No runs</Text>} />
  ),
  play: async ({ canvas }) => {
    await expect(await canvas.findByText('No runs')).toBeVisible();
  },
};

export const Loading: Story = {
  render: () => (
    <List
      items={[]}
      renderItem={() => null}
      isLoading
      empty={<Text>No runs</Text>}
    />
  ),
  play: async ({ canvas }) => {
    await expect(await canvas.findByLabelText('Loading')).toBeVisible();
    await expect(canvas.queryByText('No runs')).toBeNull();
  },
};

function CollapsingSection(): React.JSX.Element {
  const [isExpanded, setExpanded] = useState(true);

  return (
    <List appearance="plain">
      <List.Section
        title="Runs"
        leading={
          <Icon size="sm" name={isExpanded ? 'folder-open' : 'folder'} />
        }
        footer="Latest builds"
        isExpanded={isExpanded}
        onExpandedChange={setExpanded}
      >
        <ListItem title="Build web" />
        <ListItem title="Build native" />
      </List.Section>
    </List>
  );
}

export const Section: Story = {
  render: () => <CollapsingSection />,
  play: async ({ canvas, userEvent }) => {
    await expect(await canvas.findByText('Build web')).toBeVisible();
    await expect(canvas.getByText('Latest builds')).toBeVisible();
    await expect(canvas.getByTestId('icon-folder-open')).toBeVisible();
    await userEvent.click(canvas.getByRole('button', { name: 'Runs' }));
    await expect(canvas.queryByText('Build web')).toBeNull();
    await expect(canvas.getByTestId('icon-folder')).toBeVisible();
    await userEvent.click(canvas.getByRole('button', { name: 'Runs' }));
    await expect(await canvas.findByText('Build native')).toBeVisible();
  },
};

export const Contents: Story = {
  ...Plain,
  play: async ({ canvas }) => {
    await expect(await canvas.findAllByText('Item')).toHaveLength(3);
    await expect(canvas.getByText('Section one')).toBeVisible();
    await expect(canvas.getByText('Footer')).toBeVisible();
  },
};

export const HeaderAndEndContentOnEmptyList: Story = {
  render: () => (
    <List
      items={[]}
      renderItem={() => null}
      header={<Text>Earlier runs</Text>}
      endContent={<Text>End of runs</Text>}
      empty={<Text>No runs</Text>}
    />
  ),
  play: async ({ canvas }) => {
    await expect(await canvas.findByText('Earlier runs')).toBeVisible();
    await expect(canvas.getByText('No runs')).toBeVisible();
    await expect(canvas.getByText('End of runs')).toBeVisible();
  },
};

function MultipleSelection(): React.JSX.Element {
  const [selection, onSelectionChange] = useState<readonly string[]>(['web']);

  return (
    <List>
      <List.Section
        selectionMode="multiple"
        selection={selection}
        onSelectionChange={onSelectionChange}
      >
        <ListItem id="web" title="Web" />
        <ListItem id="phone" title="Phone" />
        <ListItem id="locked" title="Locked" disabled />
      </List.Section>
      <Text>{selection.join(',')}</Text>
    </List>
  );
}

export const SelectAndDeselectMultiple: Story = {
  render: () => <MultipleSelection />,
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(await canvas.findByRole('button', { name: 'Phone' }));
    await expect(canvas.getByText('web,phone')).toBeVisible();
    await userEvent.click(canvas.getByRole('button', { name: 'Web' }));
    await expect(canvas.getByText('phone')).toBeVisible();
    await expect(canvas.getByRole('button', { name: 'Locked' })).toBeDisabled();
  },
};

export const GroupedSections: Story = {
  ...Grouped,
  play: async ({ canvas }) => {
    await expect(await canvas.findByText('Recent')).toBeVisible();
    await expect(canvas.getByText('All branches')).toBeVisible();
    await expect(canvas.getByText('The branches you used last.')).toBeVisible();
    await expect(canvas.getByText('Current')).toBeVisible();
    await expect(canvas.getByText('develop')).toBeVisible();
    await expect(canvas.getByText('feature/branch-1')).toBeVisible();
  },
};
