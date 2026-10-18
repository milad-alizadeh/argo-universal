import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import type * as React from 'react';
import { View } from 'react-native';
import { Text } from '#primitives/content/text';
import { OnboardingFrame, type OnboardingFrameProps } from './onboarding-frame';

const meta = {
  title: 'Frame/OnboardingFrame',
  component: OnboardingFrame,
  parameters: { screenPreview: true },
  // JSX in args breaks on-device Storybook's arg inference, so render draws the page.
  args: { children: null },
  render: (args): React.JSX.Element => (
    <View className="h-150 w-full">
      <OnboardingFrame {...args}>
        <View className="flex-1 items-center justify-center">
          <Text>Onboarding</Text>
        </View>
      </OnboardingFrame>
    </View>
  ),
} satisfies Meta<OnboardingFrameProps>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Overview: Story = { name: 'OnboardingFrame' };
