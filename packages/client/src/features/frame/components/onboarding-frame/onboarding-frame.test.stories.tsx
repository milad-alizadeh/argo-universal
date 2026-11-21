import { settleLayout } from '@repo/kit/mocks/story-layout';
import { Text } from '@repo/kit/primitives/content/text';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import type * as React from 'react';
import { View } from 'react-native';
import { expect } from 'storybook/test';
import { railId, sessionListId } from '../../scaffold/scaffold-controls.mocks';
import { OnboardingFrame, type OnboardingFrameProps } from './onboarding-frame';

const meta = {
  title: 'Tests/Frame/OnboardingFrame',
  component: OnboardingFrame,
  args: { children: null },
  beforeEach: (): Promise<void> => settleLayout('wide'),
  render: (args): React.JSX.Element => (
    <View className="h-150 w-full">
      <OnboardingFrame {...args}>
        <Text>Onboarding</Text>
      </OnboardingFrame>
    </View>
  ),
} satisfies Meta<OnboardingFrameProps>;

export default meta;

type Story = StoryObj<typeof meta>;

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
