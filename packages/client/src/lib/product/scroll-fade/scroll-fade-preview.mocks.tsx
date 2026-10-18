import type * as React from 'react';
import { View } from 'react-native';
import { Text } from '#primitives/content/text';
import { ScrollFadeView } from './scroll-fade';

const outputLines = Array.from(
  { length: 40 },
  (_, index) =>
    `Web Bundled ${120 + index * 7}ms index.ts (${index + 1} modules)`,
);

function PreviewOutput({ lines }: { lines: string[] }): React.JSX.Element {
  return (
    <ScrollFadeView
      testID="scroll-fade-scroll"
      surfaceClassName="bg-content"
      contentContainerClassName="px-4 pb-3"
    >
      {lines.map((line) => (
        <Text key={line} role="code">
          {line}
        </Text>
      ))}
    </ScrollFadeView>
  );
}

function PreviewHeader(): React.JSX.Element {
  return (
    <View className="h-11 flex-row items-center px-4">
      <Text role="control">pnpm dev</Text>
    </View>
  );
}

const panelHeight = { height: 320 };

// A panel with a fixed header over output that scrolls under it, like a Shell panel.
export function ScrollFadePreview({
  lines = outputLines,
}: {
  lines?: string[];
}): React.JSX.Element {
  return (
    <View
      className="w-full max-w-sm overflow-hidden rounded-xl bg-content"
      style={panelHeight}
    >
      <PreviewHeader />
      <PreviewOutput lines={lines} />
    </View>
  );
}
