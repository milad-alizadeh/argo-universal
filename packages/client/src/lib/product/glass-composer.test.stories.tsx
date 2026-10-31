import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import type * as React from 'react';
import { View } from 'react-native';
import { expect } from 'storybook/test';
import { GlassComposer } from './glass-composer';

const stageHeight = 300;

const headerHeight = 100;

const noMeasure = (): void => {};

const meta = {
  title: 'Tests/Design System/Patterns/GlassComposer',
  component: GlassComposer,
  parameters: { screenPreview: true },
  args: { top: headerHeight, measure: noMeasure },
  decorators: [
    (Story): React.JSX.Element => (
      <View
        testID="stage"
        className="relative w-full"
        style={{ height: stageHeight }}
      >
        <Story />
      </View>
    ),
  ],
  // A Composer taller than the stage leaves it, as a wrapped draft and large pills do under the keyboard.
  render: (args): React.JSX.Element => (
    <GlassComposer {...args}>
      <View className="min-h-0 shrink" style={{ height: stageHeight * 2 }} />
    </GlassComposer>
  ),
} satisfies Meta<typeof GlassComposer>;

export default meta;

type Story = StoryObj<typeof meta>;

// A transparent header lays the page under the status bar and the Back button: the Composer, however tall, stops at the header's bottom edge (#1648).
export const StopsBelowTheFloatingHeader: Story = {
  play: async ({ canvas }) => {
    const stage = await canvas.findByTestId('stage');
    const column = await canvas.findByTestId('composer-column');

    await expect(
      column.getBoundingClientRect().top - stage.getBoundingClientRect().top,
    ).toBeGreaterThanOrEqual(headerHeight);
  },
};
