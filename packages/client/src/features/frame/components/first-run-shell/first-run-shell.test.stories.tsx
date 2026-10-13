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
    // The story's own window, so the page can be measured against it.
    <View testID="window" className="h-[600px] w-full">
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
    const page = canvas.getByText('Get started').getBoundingClientRect();
    const window = canvas.getByTestId('window').getBoundingClientRect();
    await expect(page.width).toBe(window.width);
  },
};

export const NoRailOrList: Story = {
  play: async ({ canvas }) => {
    await expect(canvas.queryByTestId(railId)).toBeNull();
    await expect(canvas.queryByTestId(sessionListId)).toBeNull();
  },
};

export const ShowsTheConnectionBanner: Story = {
  args: { banner: <Text>Reconnecting…</Text> },
  play: async ({ canvas }) => {
    await expect(canvas.getByText('Reconnecting…')).toBeVisible();
  },
};
