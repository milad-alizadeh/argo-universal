import {
  helloRoot,
  helloTapEvent,
  slottedRow,
  invalidPropsRoot,
  unknownNodesRoot,
  stackRowRoot,
  rowAliasRoot,
  stackColumnRoot,
  columnAliasRoot,
} from '@repo/contracts/plugins/wire-fixtures';
import { pluginPageFallback } from '@repo/contracts/plugins/wire-limits';
import svgFixtures from '@repo/mocks/plugins/svg.json' with { type: 'json' };
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { expect, fn } from 'storybook/test';
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
  render: () => <PluginTree root={helloRoot} onEvent={onEvent} />,
  play: async ({ canvas, userEvent }) => {
    await expect(canvas.getByText('Hello from a Plugin')).toBeVisible();
    await userEvent.click(canvas.getByRole('button', { name: 'Tap me' }));
    await expect(onEvent).toHaveBeenCalledOnce();
    await expect(onEvent).toHaveBeenCalledWith('0/2/0', {
      event: helloTapEvent,
    });
  },
};

export const SvgPress: Story = {
  render: () => (
    <PluginTree
      root={{
        type: 'Svg',
        key: '0',
        props: {
          xml: svgFixtures.valid[0]!.xml,
          label: 'Service map',
          onPress: { $event: 'onPress' },
        },
        children: [],
        slots: {},
      }}
      onEvent={onEvent}
    />
  ),
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(canvas.getByRole('button', { name: 'Service map' }));
    await expect(onEvent).toHaveBeenCalledWith('0', { event: 'onPress' });
  },
};

export const SvgFallback: Story = {
  render: () => (
    <PluginTree
      root={{
        type: 'Svg',
        key: '0',
        props: { xml: '<svg><path></svg>', label: 'Service map' },
        children: [],
        slots: {},
      }}
      onEvent={onEvent}
    />
  ),
  play: async ({ canvas }) => {
    await expect(canvas.getByText('Service map')).toBeVisible();
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
