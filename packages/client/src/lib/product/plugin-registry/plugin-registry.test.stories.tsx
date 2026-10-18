import {
  runListRoot,
  emptyRunListRoot,
  counterRoot,
  counterTapEvent,
  slottedRow,
  invalidPropsRoot,
  unknownNodesRoot,
  stackRowRoot,
  rowAliasRoot,
  stackColumnRoot,
  columnAliasRoot,
} from '@repo/contracts/plugins/wire-fixtures';
import { pluginPageFallback } from '@repo/contracts/plugins/wire-limits';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { expect, fn } from 'storybook/test';
import { PluginDetailView } from '../../../screens/plugins/$path/plugin-detail-view';
import { PluginTree } from './plugin-registry';

const onEvent = fn();

function rectAt(rectangles: DOMRect[], index: number): DOMRect {
  const rectangle = rectangles[index];

  if (!rectangle) throw new Error(`Missing rectangle at ${index}`);

  return rectangle;
}

const meta = { title: 'Tests/Plugin registry' } satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

export const Tap: Story = {
  render: () => <PluginTree root={counterRoot} onEvent={onEvent} />,
  play: async ({ canvas, userEvent }) => {
    await expect(canvas.getByText('Counter fixture')).toBeVisible();
    await expect(canvas.getByText('Healthy')).toBeVisible();
    await expect(canvas.getByText('Waiting jobs')).toBeVisible();
    await expect(canvas.getByText('3')).toBeVisible();
    await userEvent.click(canvas.getByRole('button', { name: 'Tap me' }));
    await expect(onEvent).toHaveBeenCalledOnce();
    await expect(onEvent).toHaveBeenCalledWith('0/4/0', {
      event: counterTapEvent,
    });
  },
};

export const UnknownNodes: Story = {
  render: () => <PluginTree root={unknownNodesRoot} onEvent={onEvent} />,
  play: async ({ canvas }) => {
    await expect(canvas.getByText('Before')).toBeVisible();
    await expect(canvas.getByText('After')).toBeVisible();
    await expect(canvas.getByText('Update Argo to see this')).toBeVisible();
    await expect(canvas.queryByText('Inside')).toBeNull();
    await expect(canvas.queryByText('Sparkline')).toBeNull();
  },
};

export const InvalidProps: Story = {
  render: () => <PluginTree root={invalidPropsRoot} onEvent={onEvent} />,
  play: async ({ canvas }) => {
    await expect(canvas.getByText('Still here')).toBeVisible();
    await expect(canvas.queryByText('42')).toBeNull();
  },
};

export const Slots: Story = {
  render: () => <PluginTree root={slottedRow} onEvent={onEvent} />,
  play: async ({ canvas, userEvent }) => {
    await expect(canvas.getByText('First')).toBeVisible();
    await expect(canvas.getByText('Second')).toBeVisible();
    await expect(canvas.getByText('Count 0')).toBeVisible();
    await userEvent.click(canvas.getByRole('button', { name: 'Increment' }));
    await expect(onEvent).toHaveBeenCalledWith('row#accessories/button', {
      event: 'onPress',
    });
  },
};

export const RefusedPage: Story = {
  render: () => <PluginTree root={pluginPageFallback} onEvent={onEvent} />,
  play: async ({ canvas }) => {
    await expect(
      canvas.getByText('This Plugin page could not be displayed.'),
    ).toBeVisible();
    await expect(canvas.queryByRole('button')).toBeNull();
  },
};

export const StackAliases: Story = {
  render: () => (
    <>
      <PluginTree root={stackRowRoot} onEvent={onEvent} />
      <PluginTree root={rowAliasRoot} onEvent={onEvent} />
      <PluginTree root={stackColumnRoot} onEvent={onEvent} />
      <PluginTree root={columnAliasRoot} onEvent={onEvent} />
    </>
  ),
  play: async ({ canvas }) => {
    const first = canvas
      .getAllByText('First')
      .map((element) => element.getBoundingClientRect());

    const second = canvas
      .getAllByText('Second')
      .map((element) => element.getBoundingClientRect());

    await expect(first).toHaveLength(4);
    await expect(second).toHaveLength(4);
    // Stack and Row put children in the same horizontal order; Stack and Column do the same vertically.
    await expect(rectAt(first, 0).left).toBeLessThan(rectAt(second, 0).left);
    await expect(rectAt(first, 1).left).toBeLessThan(rectAt(second, 1).left);
    await expect(rectAt(first, 2).top).toBeLessThan(rectAt(second, 2).top);
    await expect(rectAt(first, 3).top).toBeLessThan(rectAt(second, 3).top);
  },
};

const listAnatomy: Story = {
  parameters: { screenPreview: true },
  render: () => <PluginDetailView root={runListRoot} onEvent={onEvent} />,
  play: async ({ canvas, userEvent }) => {
    await expect(await canvas.findByText('CI runs')).toBeVisible();
    await expect(canvas.getByText('main')).toBeVisible();
    await expect(canvas.getByText('2/5 jobs')).toBeVisible();
    await expect(canvas.getByText('Production')).toBeVisible();
    await expect(canvas.getByText('now')).toBeVisible();
    await expect(canvas.getByRole('progressbar')).toHaveAttribute(
      'aria-valuenow',
      '40',
    );
    await userEvent.click(canvas.getByRole('button', { name: 'Deploy web' }));
    await expect(onEvent).toHaveBeenCalledWith('runs/builds/web', {
      event: 'onPress',
    });
  },
};

function listPage(type: 'List' | 'VirtualList' | 'GroupedList'): Story {
  return {
    ...listAnatomy,
    render: () => (
      <PluginDetailView root={{ ...runListRoot, type }} onEvent={onEvent} />
    ),
  };
}

export const ListAnatomy = listPage('List');

export const VirtualListAnatomy = listPage('VirtualList');

export const GroupedListAnatomy = listPage('GroupedList');

export const EmptyList: Story = {
  parameters: { screenPreview: true },
  render: () => <PluginDetailView root={emptyRunListRoot} onEvent={onEvent} />,
  play: async ({ canvas }) => {
    await expect(await canvas.findByText('No runs yet')).toBeVisible();
  },
};
