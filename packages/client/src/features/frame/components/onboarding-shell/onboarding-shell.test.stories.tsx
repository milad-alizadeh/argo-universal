import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import type * as React from 'react';
import { View } from 'react-native';
import { expect } from 'storybook/test';
import { Text } from '#primitives/display/text/text';
import { layoutWidths } from '../../../../lib/generic/each-layout';
import { settleViewport } from '../../../../lib/generic/settle-viewport';
import {
  railId,
  sessionListId,
} from '../desktop-shell/desktop-shell-controls.mocks';
import { OnboardingShell, type OnboardingShellProps } from './onboarding-shell';

const meta = {
  title: 'Tests/OnboardingShell',
  component: OnboardingShell,
  args: { children: null },
  beforeEach: (): Promise<void> => settleViewport(layoutWidths.wide),
  render: (args): React.JSX.Element => (
    // The story's own window, so the page can be measured against it.
    <View testID="window" className="h-[600px] w-full">
      <OnboardingShell {...args}>
        <Text>Onboarding</Text>
      </OnboardingShell>
    </View>
  ),
} satisfies Meta<OnboardingShellProps>;

export default meta;

type Story = StoryObj<typeof meta>;

// Onboarding fills the window; the rail and list wait for the first Project.
export const PageFillsTheWindow: Story = {
  play: async ({ canvas }) => {
    const page = canvas.getByText('Onboarding').getBoundingClientRect();
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
