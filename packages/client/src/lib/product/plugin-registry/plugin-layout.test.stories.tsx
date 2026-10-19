import type { WireNode } from '@repo/contracts/plugins/wire';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { expect, fn, within } from 'storybook/test';
import { PluginTree } from './plugin-registry';

const meta = { title: 'Tests/Plugin layout parts' } satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

const openBuild = 'Open build';

const onEvent = fn(async () => {});

function node(
  type: string,
  key: string,
  props: WireNode['props'] = {},
): WireNode {
  return { type, key, props, children: [], slots: {} };
}

const card: WireNode = {
  ...node('Surface', 'card', {
    kind: 'card',
    padding: 4,
    onPress: { $event: 'onPress' },
  }),
  children: [node('Text', 'title', { children: openBuild })],
  slots: {
    actions: [
      {
        ...node('ActionList', 'share'),
        children: [
          node('Action', 'copy', {
            label: 'Copy link',
            icon: 'copy',
            onPress: { $event: 'onPress' },
          }),
        ],
      },
      {
        ...node('ActionList', 'actions'),
        children: [
          node('Action', 'archive', {
            label: 'Archive build',
            icon: 'archive',
            onPress: { $event: 'onPress' },
          }),
        ],
      },
    ],
  },
};

const root: WireNode = {
  ...node('ScrollView', 'scroll'),
  children: [
    {
      ...node('Grid', 'grid', { columns: { compact: 1, wide: 4 }, gap: 3 }),
      children: [
        card,
        {
          ...node('Surface', 'summary', { kind: 'muted', padding: 4 }),
          children: [
            {
              ...node('Stack', 'row', { direction: 'row' }),
              children: [
                node('Text', 'count', { children: '3 jobs' }),
                node('Spacer', 'space'),
                node('Text', 'state', { children: 'Healthy' }),
              ],
            },
          ],
        },
      ],
    },
  ],
};

export const ActivatesSurface: Story = {
  render: () => <PluginTree root={root} onEvent={onEvent} />,
  play: async ({ canvas, userEvent }) => {
    await expect(canvas.getByText('Healthy')).toBeVisible();
    await userEvent.click(canvas.getByRole('button', { name: openBuild }));
    await expect(onEvent).toHaveBeenCalledWith('scroll/grid/card', {
      event: 'onPress',
    });
  },
};

// Two ActionLists in the actions Slot reach Surface the way the renderer sends a plural Slot.
export const DispatchesContextAction: Story = {
  render: () => <PluginTree root={root} onEvent={onEvent} />,
  play: async ({ canvas, userEvent, canvasElement }) => {
    await userEvent.pointer({
      target: canvas.getByText(openBuild),
      keys: '[MouseRight]',
    });
    const menu = within(canvasElement.ownerDocument.body);

    await expect(
      await menu.findByRole('menuitem', { name: 'Copy link' }),
    ).toBeInTheDocument();
    await userEvent.click(
      await menu.findByRole('menuitem', { name: 'Archive build' }),
    );
    await expect(onEvent).toHaveBeenCalledWith(
      'scroll/grid/card#actions/actions/archive',
      { event: 'onPress' },
    );
  },
};
