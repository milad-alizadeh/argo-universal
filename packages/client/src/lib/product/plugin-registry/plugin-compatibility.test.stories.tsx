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

export const OlderServerText: Story = {
  render: () => (
    <PluginTree
      root={{
        type: 'Column',
        key: 'legacy',
        props: {},
        slots: {},
        children: [
          {
            type: 'Text',
            key: 'v1',
            props: { label: 'Text from v1', variant: 'body' },
            children: [],
            slots: {},
          },
          {
            type: 'Text',
            key: 'v2',
            props: {
              label: 'Text from v2',
              variant: 'heading',
              accessibilityLabel: 'Legacy spoken title',
            },
            children: [],
            slots: {},
          },
        ],
      }}
      onEvent={onEvent}
    />
  ),
  play: async ({ canvas }) => {
    await expect(canvas.getByText('Text from v1')).toBeVisible();
    await expect(canvas.getByText('Text from v2')).toBeVisible();
    await expect(canvas.getByLabelText('Legacy spoken title')).toBeVisible();
    await expect(canvas.queryByText(updateMessage)).toBeNull();
  },
};
