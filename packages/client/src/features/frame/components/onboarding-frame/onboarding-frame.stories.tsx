import { Text } from '@repo/kit/primitives/content/text';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import type * as React from 'react';
import { View } from 'react-native';
import { OnboardingFrame, type OnboardingFrameProps } from './onboarding-frame';

const meta = {
  title: 'Frame/OnboardingFrame',
  component: OnboardingFrame,
  parameters: { screenPreview: true },
  // Both props are JSX, so neither takes a control and the frame has no fixtures of its own.
  argTypes: {
    banner: { control: false },
    children: { control: false },
  },
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

/*
 * A Server with no Projects yet: Onboarding fills the window, with no rail or list. The banner
 * Slot draws whatever it is handed, so a Connection banner is ConnectionBanner's own story.
 */
export const Onboarding: Story = {};
