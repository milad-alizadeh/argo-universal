import {
  helloRoot,
  slottedRow,
  helloTapEventId,
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
import { PluginTree } from './plugin-registry';

const onEvent = fn();

const updateMessage = 'Update Argo to see this';

function rectAt(rectangles: DOMRect[], index: number): DOMRect {
  const rectangle = rectangles[index];

  if (!rectangle) throw new Error(`Missing rectangle at ${index}`);

  return rectangle;
}

const meta = { title: 'Tests/Plugin registry' } satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

export const Tap: Story = {
  render: () => <PluginTree root={helloRoot} onEvent={onEvent} />,
  play: async ({ canvas, userEvent }) => {
    await expect(canvas.getByText('Hello from a Plugin')).toBeVisible();
    await userEvent.click(canvas.getByRole('button', { name: 'Tap me' }));
    await expect(onEvent).toHaveBeenCalledOnce();
    await expect(onEvent).toHaveBeenCalledWith(helloTapEventId);
  },
};

export const UnknownNodes: Story = {
  render: () => <PluginTree root={unknownNodesRoot} onEvent={onEvent} />,
  play: async ({ canvas }) => {
    await expect(canvas.getByText('Before')).toBeVisible();
    await expect(canvas.getByText('After')).toBeVisible();
    await expect(canvas.getByText(updateMessage)).toBeVisible();
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
    await expect(onEvent).toHaveBeenCalledWith('slot:increment');
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

export const NewerOptionalProp: Story = {
  render: () => (
    <PluginTree
      root={{
        type: 'Text',
        key: 'text',
        props: { label: 'Still readable', futureOptionalProp: true },
        children: [],
        slots: {},
      }}
      onEvent={onEvent}
    />
  ),
  play: async ({ canvas }) => {
    await expect(canvas.getByText('Still readable')).toBeVisible();
    await expect(canvas.queryByText(updateMessage)).toBeNull();
  },
};

export const InvalidContainer: Story = {
  render: () => (
    <PluginTree
      root={{
        type: 'Stack',
        key: 'stack',
        props: { direction: 'diagonal' },
        children: [
          {
            type: 'Text',
            key: 'child',
            props: { label: 'Hidden child' },
            children: [],
            slots: {},
          },
        ],
        slots: {},
      }}
      onEvent={onEvent}
    />
  ),
  play: async ({ canvas }) => {
    await expect(canvas.getByText(updateMessage)).toBeVisible();
    await expect(canvas.queryByText('Hidden child')).toBeNull();
  },
};

export const InvalidEmptyContainer: Story = {
  render: () => (
    <PluginTree
      root={{
        type: 'Row',
        key: 'empty',
        props: { gap: 'invalid' },
        children: [],
        slots: {},
      }}
      onEvent={onEvent}
    />
  ),
  play: async ({ canvas }) => {
    await expect(canvas.getByText(updateMessage)).toBeVisible();
  },
};
