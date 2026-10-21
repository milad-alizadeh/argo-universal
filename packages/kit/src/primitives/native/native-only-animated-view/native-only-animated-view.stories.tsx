import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { View } from 'react-native';
import { FadeIn } from 'react-native-reanimated';
import { Text } from '#primitives/content/text';
import { NativeOnlyAnimatedView } from './native-only-animated-view';

/*
 * No argTypes: a children-only wrapper declares no enumerable props of its own, so this page has no props table
 * (docs/agents/storybook.md records it as one of those pages).
 */
const meta = {
  title: 'Design System/Primitives/Native/NativeOnlyAnimatedView',
  component: NativeOnlyAnimatedView,
  tags: ['third-party'],
  args: {
    entering: FadeIn.duration(200),
    children: (
      <View className="rounded-md border border-border bg-card p-6">
        <Text>Animated on native; a regular View on web.</Text>
      </View>
    ),
  },
} satisfies Meta<typeof NativeOnlyAnimatedView>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
