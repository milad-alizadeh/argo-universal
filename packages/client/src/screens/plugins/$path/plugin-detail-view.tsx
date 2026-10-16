import type * as React from 'react';
import { View } from 'react-native';
import { Text } from '#primitives/display/text';

export interface PluginDetailViewProps {
  name: string;
}

// Foundations / PluginPage: a manifest's name, before Plugin code can draw its page.
export function PluginDetailView({
  name,
}: PluginDetailViewProps): React.JSX.Element {
  return (
    <View
      testID="plugin-page"
      className="flex-1 items-center justify-center bg-content p-6"
    >
      <Text role="heading" accessibilityRole="heading" aria-level={1}>
        {name}
      </Text>
    </View>
  );
}
