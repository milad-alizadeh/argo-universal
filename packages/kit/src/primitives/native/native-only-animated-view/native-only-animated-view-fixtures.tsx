import type { ComponentProps } from 'react';
import { View } from 'react-native';
import { FadeIn } from 'react-native-reanimated';
import { Text } from '#primitives/content/text';
import type { NativeOnlyAnimatedView } from './native-only-animated-view';

export const defaultNativeOnlyAnimatedView = {
  entering: FadeIn.duration(200),
  children: (
    <View className="rounded-md border border-border bg-card p-6">
      <Text>Animated on native; a regular View on web.</Text>
    </View>
  ),
} satisfies ComponentProps<typeof NativeOnlyAnimatedView>;
