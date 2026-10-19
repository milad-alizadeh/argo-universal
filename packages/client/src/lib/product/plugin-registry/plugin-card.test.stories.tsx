import type { WireNode } from '@repo/contracts/plugins/wire';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { expect, fn } from 'storybook/test';
import { PluginTree } from './plugin-registry';

const meta = { title: 'Tests/Plugin Card' } satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

const onEvent = fn(async () => {});

// A Card as a Plugin sends it: its action in the actions Slot, the body as children.
const root = {
  type: 'Card',
  key: 'deploy',
  props: {
    title: 'api-gateway',
    subtitle: 'Production',
    onPress: { $event: 'onPress' },
  },
  children: [
    {
      type: 'Text',
      key: 'body',
      props: { children: 'Deployed 12 min ago' },
      children: [],
      slots: {},
    },
  ],
  slots: {
    actions: [
      {
        type: 'IconButton',
        key: 'more',
        props: {
          icon: 'more',
          accessibilityLabel: 'More',
          onPress: { $event: 'onPress' },
        },
        children: [],
        slots: {},
      },
    ],
  },
} satisfies WireNode;

export const DispatchesPress: Story = {
  render: () => <PluginTree root={root} onEvent={onEvent} />,
  play: async ({ canvas, userEvent }) => {
    await expect(canvas.getByText('Deployed 12 min ago')).toBeVisible();
    await userEvent.click(
      canvas.getByRole('button', { name: 'api-gateway, Production' }),
    );
    await expect(onEvent).toHaveBeenCalledWith('deploy', { event: 'onPress' });
  },
};

export const DispatchesAction: Story = {
  render: () => <PluginTree root={root} onEvent={onEvent} />,
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(canvas.getByRole('button', { name: 'More' }));
    await expect(onEvent).toHaveBeenCalledOnce();
    await expect(onEvent).toHaveBeenCalledWith('deploy#actions/more', {
      event: 'onPress',
    });
  },
};
