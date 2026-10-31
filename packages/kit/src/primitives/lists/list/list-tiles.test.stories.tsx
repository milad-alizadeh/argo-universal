import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { useState } from 'react';
import { expect, fn, waitFor, type within } from 'storybook/test';
import {
  type VirtualWall,
  settleVirtualWall,
  settleVirtualWallAtEnd,
} from '#mocks/settle-virtual-wall';
import { settleLayout } from '#mocks/story-layout';
import { Text } from '#primitives/content/text';
import { ListItem } from '#primitives/lists/list-item';
import { List } from './list';
import { GridExample } from './list-tiles.stories';

const meta = {
  title: 'Tests/Design System/Primitives/Lists/List/Tiles',
  beforeEach: async (): Promise<void> => {
    await settleLayout('wide');
  },
  parameters: { screenPreview: true },
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

const headingRole = 'heading';

const secondTitle = 'Metric 2';

const pressedAttribute = 'aria-pressed';

type Canvas = ReturnType<typeof within>;

// The most charts a wall draws at once: a fact of the wall, stated here independently of the kit's own limit.
const chartBudget = 24;

const wallOf = (canvas: Canvas, scroller: HTMLElement): VirtualWall => ({
  scroller,
  tiles: (): HTMLElement[] =>
    canvas.queryAllByRole('button', { name: /^Metric \d+$/ }),
  charts: (): HTMLElement[] =>
    canvas.queryAllByRole('img', { name: /Metric \d+ trend/ }),
  budget: chartBudget,
});

const firstChart = 'Metric 1 trend';

// The wall is virtualised, so its charts are drawn once its window is filled, however long a busy runner takes.
async function drawnWall(canvas: Canvas): Promise<HTMLElement> {
  const scroller = await canvas.findByTestId('metrics-wall');
  await settleVirtualWall(wallOf(canvas, scroller));

  return scroller;
}

export const Selection: Story = {
  render: () => <GridExample />,
  play: async ({ canvas, userEvent }) => {
    await drawnWall(canvas);
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
    const scroll = await drawnWall(canvas);
    await expect(canvas.getByRole('img', { name: firstChart })).toBeVisible();
    await expect(
      canvas.getAllByRole('img', { name: /Metric \d+ trend/ }).length,
    ).toBeLessThanOrEqual(chartBudget);
    await settleVirtualWallAtEnd(
      wallOf(canvas, scroll),
      () =>
        canvas.queryByRole('img', { name: 'Metric 80 trend' }) !== null &&
        canvas.queryByRole('img', { name: firstChart }) === null,
    );
    await expect(
      canvas.getByRole('img', { name: 'Metric 80 trend' }),
    ).toBeVisible();
    await expect(canvas.queryByRole('img', { name: firstChart })).toBeNull();
  },
};

export const CompactSelection: Story = {
  ...Selection,
  beforeEach: async (): Promise<void> => {
    await settleLayout('phone');
  },
};
