import type { WireNode } from '@repo/contracts/plugins/wire';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import type * as React from 'react';
import { View } from 'react-native';
import { expect } from 'storybook/test';
import { DraftSeamContext, type DraftSeam } from './draft-seam';
import { PluginTree } from './plugin-registry';

const text = (key: string, value: string): WireNode => ({
  type: 'Text',
  key,
  props: { children: value },
  slots: {},
  children: [],
});

const root: WireNode = {
  type: 'Stack',
  key: 'page',
  props: { direction: 'column' },
  slots: {},
  children: [text('header', 'Issues'), text('list', 'Rows')],
};

const seam: DraftSeam = {
  frames: (node) => node.key === 'header',
  Frame: ({ children }): React.JSX.Element => (
    <View testID="frame">{children}</View>
  ),
};

const meta = {
  title: 'Tests/Design System/Patterns/PluginRegistry/DraftSeam',
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

export const FramesOnlyTheNodesTheSeamNames: Story = {
  render: () => (
    <DraftSeamContext value={seam}>
      <PluginTree root={root} />
    </DraftSeamContext>
  ),
  play: async ({ canvas }) => {
    const frames = await canvas.findAllByTestId('frame');

    await expect(frames).toHaveLength(1);
    await expect(frames[0]).toHaveTextContent('Issues');
    await expect(canvas.getByText('Rows')).toBeVisible();
  },
};

export const DrawsNoFrameWithoutASeam: Story = {
  render: () => <PluginTree root={root} />,
  play: async ({ canvas }) => {
    await canvas.findByText('Issues');

    await expect(canvas.queryByTestId('frame')).toBeNull();
  },
};
