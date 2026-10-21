import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { useState } from 'react';
import { expect, fn, waitFor } from 'storybook/test';
import { layoutWidths } from '#kit/each-layout';
import { settleViewport } from '#kit/settle-viewport';
import { Text } from '#primitives/content/text';
import { ListItem } from '#primitives/lists/list-item';
import { List } from './list';
import { GridExample } from './list-tiles.stories';

const meta = {
  title: 'Tests/Design System/Primitives/Lists/List/Tiles',
  beforeEach: async (): Promise<void> => {
    await settleViewport(layoutWidths.wide);
  },
  parameters: { screenPreview: true },
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

const headingRole = 'heading';

const secondTitle = 'Metric 2';

const pressedAttribute = 'aria-pressed';

export const Selection: Story = {
  render: () => <GridExample />,
  play: async ({ canvas, userEvent }) => {
    const first = await canvas.findByRole('button', { name: 'Metric 1' });
    const second = await canvas.findByRole('button', { name: secondTitle });
    await expect(first).toHaveAttribute(pressedAttribute, 'true');
    await userEvent.click(second);
    await waitFor(() =>
      expect(canvas.getByRole('button', { name: secondTitle })).toHaveAttribute(
        pressedAttribute,
        'true',
      ),
    );
    await expect(first).toHaveAttribute(pressedAttribute, 'false');
    first.focus();
    await userEvent.keyboard('{Enter}');
    await waitFor(() =>
      expect(first).toHaveAttribute(pressedAttribute, 'true'),
    );
    await expect(second).toHaveAttribute(pressedAttribute, 'false');
  },
};

const press = fn();

export const DisabledAndMedia: Story = {
  render: () => (
    <List layout="grid" columns={2}>
      <ListItem
        title="Unavailable"
        disabled
        onPress={press}
        media={<Text>Preview</Text>}
        leading={<Text>Row leading</Text>}
        trailing={<Text>Row trailing</Text>}
        meta={<Text>Row meta</Text>}
      />
    </List>
  ),
  play: async ({ canvas }) => {
    const tile = await canvas.findByRole('button', { name: 'Unavailable' });
    await expect(tile).toBeDisabled();
    await expect(canvas.getByText('Preview')).toBeVisible();
    await expect(canvas.queryByText('Row leading')).toBeNull();
    await expect(canvas.queryByText('Row trailing')).toBeNull();
    await expect(canvas.queryByText('Row meta')).toBeNull();
    tile.click();
    await expect(press).not.toHaveBeenCalled();
  },
};

function UpdatingShelf(): React.JSX.Element {
  const [title, setTitle] = useState('Preview');

  return (
    <List direction="horizontal" header={<Text role={headingRole}>Files</Text>}>
      <ListItem
        title={title}
        media={<Text>Thumbnail</Text>}
        onPress={() => setTitle('Opened')}
      />
    </List>
  );
}

export const ShelfPress: Story = {
  render: () => <UpdatingShelf />,
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(
      await canvas.findByRole('button', { name: 'Preview' }),
    );
    await expect(await canvas.findByText('Opened')).toBeVisible();
  },
};

export const RecycledSvgWall: Story = {
  render: () => <GridExample />,
  play: async ({ canvas }) => {
    await expect(
      await canvas.findByRole('img', { name: 'Metric 1 trend' }),
    ).toBeVisible();
    await expect(
      canvas.getAllByRole('img', { name: /Metric \d+ trend/ }).length,
    ).toBeLessThanOrEqual(24);
    const scroll = canvas.getByTestId('metrics-wall');
    await waitFor(async () => {
      scroll.scrollTo({ top: scroll.scrollHeight });
      await expect(
        canvas.getByRole('img', { name: 'Metric 80 trend' }),
      ).toBeVisible();
    });
    await expect(
      canvas.queryByRole('img', { name: 'Metric 1 trend' }),
    ).toBeNull();
  },
};

export const CompactSelection: Story = {
  ...Selection,
  beforeEach: async (): Promise<void> => {
    await settleViewport(layoutWidths.phone);
  },
};
