import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { expect, waitFor } from 'storybook/test';
import { layoutWidths } from '#kit/each-layout';
import { settleViewport } from '#kit/settle-viewport';
import { Text } from '#primitives/content/text';
import { ListItem } from '#primitives/lists/list-item';
import { List } from './list';

const meta = {
  title: 'Tests/List layout',
  parameters: { screenPreview: true },
  beforeEach: async (): Promise<void> => {
    await settleViewport(layoutWidths.tablet);
  },
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

const tiles = ['First', 'Second', 'Third', 'Fourth', 'Fifth'];

export const NumericColumns: Story = {
  render: () => (
    <List layout="grid" columns={4}>
      {tiles.map((title) => (
        <ListItem key={title} title={title} onPress={() => {}} />
      ))}
    </List>
  ),
  play: async ({ canvas }) => {
    const first = await canvas.findByRole('button', { name: 'First' });
    const fourth = await canvas.findByRole('button', { name: 'Fourth' });
    const fifth = await canvas.findByRole('button', { name: 'Fifth' });
    await waitFor(() =>
      expect(fourth.getBoundingClientRect().top).toBe(
        first.getBoundingClientRect().top,
      ),
    );
    await expect(fifth.getBoundingClientRect().top).toBeGreaterThan(
      first.getBoundingClientRect().top,
    );
  },
};

export const SectionShelves: Story = {
  render: () => (
    <List direction="horizontal" tileSize="sm">
      <List.Section title="First collection" footer="Collection footer">
        <ListItem title="First item" media={<Text>First preview</Text>} />
      </List.Section>
      <List.Section title="Second collection">
        <ListItem title="Second item" media={<Text>Second preview</Text>} />
      </List.Section>
    </List>
  ),
  play: async ({ canvas }) => {
    await expect(
      await canvas.findByRole('heading', { name: 'First collection' }),
    ).toBeVisible();
    await expect(
      await canvas.findByRole('heading', { name: 'Second collection' }),
    ).toBeVisible();
    await expect(await canvas.findByText('Collection footer')).toBeVisible();
    await expect(await canvas.findByText('First preview')).toBeVisible();
    await expect(await canvas.findByText('Second preview')).toBeVisible();
  },
};
