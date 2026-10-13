import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import type * as React from 'react';
import { View } from 'react-native';
import { expect } from 'storybook/test';
import { Text } from '#lib/generic/primitives/display/text/text';
import { layoutWidths } from '../../../../lib/generic/each-layout';
import { settleViewport } from '../../../../lib/generic/settle-viewport';
import {
  railId,
  sessionListId,
} from '../desktop-shell/desktop-shell-controls.mocks';
import { FirstRunShell, type FirstRunShellProps } from './first-run-shell';

const meta = {
  title: 'Tests/FirstRunShell',
  component: FirstRunShell,
  args: { children: null },
  beforeEach: (): Promise<void> => settleViewport(layoutWidths.wide),
  render: (args): React.JSX.Element => (
    <View className="h-[600px] w-full">
      <FirstRunShell {...args}>
        <Text>Get started</Text>
      </FirstRunShell>
    </View>
  ),
} satisfies Meta<FirstRunShellProps>;
export default meta;
type Story = StoryObj<typeof meta>;

// Get started fills the window; the rail and list wait for the first Project.
export const PageFillsTheWindow: Story = {
  play: async ({ canvas }) => {
    await expect(canvas.getByText('Get started')).toBeVisible();
    await expect(canvas.queryByTestId(railId)).toBeNull();
    await expect(canvas.queryByTestId(sessionListId)).toBeNull();
    const shell = canvas.getByTestId('desktop-shell').getBoundingClientRect();
    const detail = canvas.getByTestId('desktop-detail').getBoundingClientRect();
    await expect(detail.width).toBe(shell.width);
    await expect(canvas.getByTestId('window-drag-strip')).toBeInTheDocument();
  },
};

export const ShowsTheConnectionBanner: Story = {
  args: { banner: <Text>Reconnecting…</Text> },
  play: async ({ canvas }) => {
    await expect(canvas.getByText('Reconnecting…')).toBeVisible();
  },
};
