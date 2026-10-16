import {
  helloSnapshot,
  invalidPropsSnapshot,
  unknownNodesSnapshot,
} from '@repo/contracts/plugins/wire-fixtures';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { expect, fn } from 'storybook/test';
import { PluginTree } from './plugin-registry';

const onEvent = fn();

const rootOf = (message: typeof helloSnapshot) => {
  if (message.type !== 'snapshot') throw new Error('Fixture is a snapshot');

  return message.root;
};

const meta = { title: 'Tests/Plugin registry' } satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

export const Tap: Story = {
  render: () => <PluginTree root={rootOf(helloSnapshot)} onEvent={onEvent} />,
  play: async ({ canvas, userEvent }) => {
    await expect(canvas.getByText('Hello from a Plugin')).toBeVisible();
    await userEvent.click(canvas.getByRole('button', { name: 'Tap me' }));
    await expect(onEvent).toHaveBeenCalledOnce();
    await expect(onEvent).toHaveBeenCalledWith('0/2/0:onPress');
  },
};

export const UnknownNodes: Story = {
  render: () => (
    <PluginTree root={rootOf(unknownNodesSnapshot)} onEvent={onEvent} />
  ),
  play: async ({ canvas }) => {
    await expect(canvas.getByText('Before')).toBeVisible();
    await expect(canvas.getByText('After')).toBeVisible();
    await expect(canvas.getByText('Update Argo to see this')).toBeVisible();
    await expect(canvas.queryByText('Inside')).toBeNull();
    await expect(canvas.queryByText('Sparkline')).toBeNull();
  },
};

export const InvalidProps: Story = {
  render: () => (
    <PluginTree root={rootOf(invalidPropsSnapshot)} onEvent={onEvent} />
  ),
  play: async ({ canvas }) => {
    await expect(canvas.getByText('Still here')).toBeVisible();
    await expect(canvas.queryByText('42')).toBeNull();
  },
};
