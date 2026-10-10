import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { View } from 'react-native';
import { FadeIn } from 'react-native-reanimated';
import { NativeOnlyAnimatedView } from './native-only-animated-view';
import { Text } from './text';

function AnimationExample(): React.JSX.Element {
  return (
    <NativeOnlyAnimatedView entering={FadeIn.duration(200)}>
      <View className="rounded-md border border-border bg-card p-6">
        <Text>Animated on native; a regular View on web.</Text>
      </View>
    </NativeOnlyAnimatedView>
  );
}
const meta = {
  title: 'Design System/Primitives/Native Only Animated View',
  tags: ['third-party'],
} satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;

export const Overview: Story = {
  name: 'Native Only Animated View',
  render: AnimationExample,
};
