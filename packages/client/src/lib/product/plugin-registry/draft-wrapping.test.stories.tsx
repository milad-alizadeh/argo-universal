import type { WireNode } from '@repo/contracts/plugins/wire';
import { settleLayout } from '@repo/kit/mocks/story-layout';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import type * as React from 'react';
import { View } from 'react-native';
import { expect } from 'storybook/test';
import type { DraftStep } from './draft-drawing-fixtures';
import { DraftSteps } from './draft-drawing.mocks';
import { DraftSeamContext, type DraftSeam } from './draft-seam';
import { PluginTree } from './plugin-registry';

const cell = (id: string, name: string): WireNode => ({
  type: 'Table.Cell',
  key: `${id}-name`,
  props: { column: 'name', text: name },
  slots: {},
  children: [],
});

const row = (id: string, name: string): WireNode => ({
  type: 'Table.Row',
  key: id,
  props: { id },
  slots: {},
  children: [cell(id, name)],
});

const table = (...rows: WireNode[]): WireNode => ({
  type: 'Table',
  key: 'people',
  props: {
    accessibilityLabel: 'People',
    columns: [{ id: 'name', title: 'Name' }],
  },
  slots: {},
  children: rows,
});

const ada = table(row('ada', 'Ada'));

const drawnRows: DraftStep[] = [
  { root: ada },
  { root: table(row('ada', 'Ada'), row('grace', 'Grace')) },
];

const meta = {
  title: 'Tests/Design System/Patterns/PluginRegistry/DraftWrapping',
  beforeEach: async (): Promise<void> => {
    await settleLayout('wide');
  },
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

// A node the App wraps while a Draft is open is still the kit component its parent reads its children as.
export const ATableReadsARowTheAgentJustDrew: Story = {
  render: () => <DraftSteps steps={drawnRows} shown={1} />,
  play: async ({ canvas }) => {
    await canvas.findByText('Ada');
    await expect(await canvas.findByText('Grace')).toBeVisible();
  },
};

export const ATableReadsARowInADeclaredRegion: Story = {
  render: () => <DraftSteps steps={drawnRows} shown={0} regions={['ada']} />,
  play: async ({ canvas }) => {
    await expect(await canvas.findByText('Ada')).toBeVisible();
  },
};

export const ATableReadsARowTheSeamFrames: Story = {
  render: () => {
    const seam: DraftSeam = {
      frames: (framed) => framed.key === 'ada',
      Frame: ({ children }): React.JSX.Element => (
        <View testID="frame">{children}</View>
      ),
    };

    return (
      <DraftSeamContext value={seam}>
        <PluginTree root={ada} />
      </DraftSeamContext>
    );
  },
  play: async ({ canvas }) => {
    await expect(await canvas.findByText('Ada')).toBeVisible();
  },
};

export const ATableReadsARowTheAuthorCanComment: Story = {
  render: () => {
    const seam: DraftSeam = {
      frames: () => false,
      commentable: true,
      Frame: ({ children }): React.JSX.Element => <View>{children}</View>,
    };

    return (
      <DraftSeamContext value={seam}>
        <PluginTree root={ada} />
      </DraftSeamContext>
    );
  },
  play: async ({ canvas }) => {
    await expect(await canvas.findByText('Ada')).toBeVisible();
  },
};
