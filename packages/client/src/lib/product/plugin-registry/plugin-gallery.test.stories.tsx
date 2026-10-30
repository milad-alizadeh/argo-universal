import type { WireNode } from '@repo/contracts/plugins/wire';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { expect, fn } from 'storybook/test';
import { PluginTree } from './plugin-registry';

const meta = {
  title: 'Tests/Design System/Patterns/PluginRegistry/Gallery',
  parameters: { screenPreview: true },
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

const onEvent = fn();

const personName = 'Sam Rivera';

const image: WireNode = {
  type: 'Image',
  key: 'image',
  props: {
    source: { pluginId: 'example', hash: 'a'.repeat(64), format: 'jpeg' },
    accessibilityLabel: 'Thumbnail',
  },
  children: [],
  slots: {},
};

const avatar: WireNode = {
  type: 'Avatar',
  key: 'avatar',
  props: { name: personName, accessibilityLabel: personName, size: 'md' },
  children: [],
  slots: {},
};

const root: WireNode = {
  type: 'List',
  key: 'gallery',
  props: { layout: 'grid', columns: 'auto', tileSize: 'sm' },
  children: [
    {
      type: 'ListItem',
      key: 'file',
      props: { title: 'Open screenshot', onPress: { $event: 'onPress' } },
      children: [],
      slots: { media: [image] },
    },
    {
      type: 'ListItem',
      key: 'person',
      props: { title: 'Assignee' },
      children: [],
      slots: { media: [avatar] },
    },
  ],
  slots: {},
};

export const DrawsAndDispatches: Story = {
  render: () => <PluginTree root={root} onEvent={onEvent} />,
  play: async ({ canvas, userEvent }) => {
    await expect(
      await canvas.findByRole('img', { name: 'Thumbnail' }),
    ).toBeVisible();
    await expect(canvas.getByRole('img', { name: personName })).toBeVisible();
    await expect(canvas.getByText('SR')).toBeVisible();
    await userEvent.click(
      canvas.getByRole('button', { name: 'Open screenshot' }),
    );
    await expect(onEvent).toHaveBeenCalledWith('gallery/file', {
      event: 'onPress',
    });
  },
};
