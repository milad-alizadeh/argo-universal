import type { WireNode } from '@repo/contracts/plugins/wire';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { expect, fn } from 'storybook/test';
import { PluginTree } from './plugin-registry';

const meta = {
  title: 'Tests/Design System/Patterns/PluginRegistry/Card',
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

const onPageCall = fn(async () => {});

// A Card as a Plugin sends it: its action in the actions Slot, the body as children.
const root = {
  type: 'Card',
  key: 'deploy',
  props: {
    title: 'api-gateway',
    subtitle: 'Production',
    onPress: { operation: 'openDeploy', args: {} },
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
          onPress: { operation: 'showMore', args: {} },
        },
        children: [],
        slots: {},
      },
    ],
  },
} satisfies WireNode;

export const RunsPress: Story = {
  render: () => <PluginTree root={root} onPageCall={onPageCall} />,
  play: async ({ canvas, userEvent }) => {
    await expect(canvas.getByText('Deployed 12 min ago')).toBeVisible();
    await userEvent.click(
      canvas.getByRole('button', { name: 'api-gateway, Production' }),
    );
    await expect(onPageCall).toHaveBeenCalledWith(
      { operation: 'openDeploy', args: {} },
      expect.objectContaining({ key: 'deploy', name: 'onPress' }),
    );
  },
};

export const RunsAction: Story = {
  render: () => <PluginTree root={root} onPageCall={onPageCall} />,
  play: async ({ canvas, userEvent }) => {
    onPageCall.mockClear();
    await userEvent.click(canvas.getByRole('button', { name: 'More' }));
    await expect(onPageCall).toHaveBeenCalledOnce();
    await expect(onPageCall).toHaveBeenCalledWith(
      { operation: 'showMore', args: {} },
      expect.objectContaining({ key: 'deploy#actions/more', name: 'onPress' }),
    );
  },
};
