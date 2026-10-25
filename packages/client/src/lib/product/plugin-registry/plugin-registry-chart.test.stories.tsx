import chartFixtures from '@repo/mocks/plugins/chart.json' with { type: 'json' };
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { expect, fn } from 'storybook/test';
import { PluginTree } from './plugin-registry';

const onEvent = fn();

const { line } = chartFixtures;

const meta = {
  title: 'Tests/Design System/Patterns/PluginRegistry/Chart',
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

export const Press: Story = {
  render: () => (
    <PluginTree
      root={{
        type: 'Chart',
        key: '0',
        props: { ...line, onPress: { $event: 'onPress' } },
        children: [],
        slots: {},
      }}
      onEvent={onEvent}
    />
  ),
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(canvas.getByRole('button', { name: line.label }));
    await expect(onEvent).toHaveBeenCalledWith('0', { event: 'onPress' });
  },
};

export const Image: Story = {
  render: () => (
    <PluginTree
      root={{ type: 'Chart', key: '0', props: line, children: [], slots: {} }}
      onEvent={onEvent}
    />
  ),
  play: async ({ canvas }) => {
    await expect(canvas.getByRole('img', { name: line.label })).toBeVisible();
  },
};
