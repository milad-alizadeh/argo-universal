import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import type * as React from 'react';
import { View } from 'react-native';
import { Text } from '#lib/generic/primitives/display/text/text';
import { OnboardingShell, type OnboardingShellProps } from './onboarding-shell';

const meta = {
  title: 'Shell/OnboardingShell',
  component: OnboardingShell,
  parameters: { screenPreview: true },
  // JSX in args breaks on-device Storybook's arg inference, so render draws the page.
  args: { children: null },
  render: (args): React.JSX.Element => (
    <View className="h-[600px] w-full">
      <OnboardingShell {...args}>
        <View className="flex-1 items-center justify-center">
          <Text>Onboarding</Text>
        </View>
      </OnboardingShell>
    </View>
  ),
} satisfies Meta<OnboardingShellProps>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Overview: Story = { name: 'OnboardingShell' };
