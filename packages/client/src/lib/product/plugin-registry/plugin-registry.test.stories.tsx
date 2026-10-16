import {
  helloRoot,
  helloTapEventId,
  invalidPropsRoot,
  unknownNodesRoot,
} from '@repo/contracts/plugins/wire-fixtures';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { expect, fn } from 'storybook/test';
import { PluginTree } from './plugin-registry';

const onEvent = fn();

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
