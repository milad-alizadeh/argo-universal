import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { expect, fn } from 'storybook/test';
import { PluginTree } from './plugin-registry';

const onEvent = fn();

const updateMessage = 'Update Argo to see this';

const meta = { title: 'Tests/Plugin compatibility' } satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

export const NewerOptionalProp: Story = {
  render: () => (
    <PluginTree
      root={{
        type: 'Text',
        key: 'text',
        props: { children: 'Still readable', futureOptionalProp: true },
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
            props: { children: 'Hidden child' },
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
        type: 'Stack',
        key: 'empty',
        props: { direction: 'row', gap: 'invalid' },
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
