import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import type * as React from 'react';
import { View } from 'react-native';
import { Text } from '#lib/generic/primitives/display/text/text';
import { FirstRunShell, type FirstRunShellProps } from './first-run-shell';

const meta = {
  title: 'Shell/FirstRunShell',
  component: FirstRunShell,
  parameters: { screenPreview: true },
  // JSX in args breaks on-device Storybook's arg inference, so render draws the page.
  args: { children: null },
  render: (args): React.JSX.Element => (
    <View className="h-[600px] w-full">
      <FirstRunShell {...args}>
        <View className="flex-1 items-center justify-center">
          <Text>Get started</Text>
        </View>
      </FirstRunShell>
    </View>
  ),
} satisfies Meta<FirstRunShellProps>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Overview: Story = { name: 'FirstRunShell' };
