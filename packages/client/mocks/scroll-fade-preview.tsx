import type * as React from 'react';
import { View } from 'react-native';
import { ScrollFadeView } from '../src/components/scroll-fade';
import { Text } from '../src/primitives/text';

const outputLines = Array.from(
  { length: 40 },
  (_, index) =>
    `Web Bundled ${120 + index * 7}ms index.ts (${index + 1} modules)`,
);

// A panel with a fixed header over output that scrolls under it, like a Shell panel.
export function ScrollFadePreview({
  lines = outputLines,
}: {
  lines?: string[];
}): React.JSX.Element {
  return (
    <View
      className="w-full max-w-sm overflow-hidden rounded-xl bg-sidebar"
      style={{ height: 320 }}
    >
      <View className="h-11 flex-row items-center px-4">
        <Text className="text-sm leading-5 font-medium">pnpm dev</Text>
      </View>
      <ScrollFadeView
        testID="scroll-fade-scroll"
        surfaceClassName="bg-sidebar"
        contentContainerClassName="px-4 pb-3"
      >
        {lines.map((line) => (
          <Text key={line} className="font-mono text-xs leading-5">
            {line}
          </Text>
        ))}
      </ScrollFadeView>
    </View>
  );
}
