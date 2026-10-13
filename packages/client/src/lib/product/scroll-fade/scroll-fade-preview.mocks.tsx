import type * as React from 'react';
import { View } from 'react-native';
import { Text } from '../../generic/primitives/display/text/text';
import { ScrollFadeView } from './scroll-fade';

const outputLines = Array.from(
  { length: 40 },
  (_, index) =>
    `Web Bundled ${120 + index * 7}ms index.ts (${index + 1} modules)`,
);

const previewStyle = { height: 320 };

// A panel with a fixed header over output that scrolls under it, like a Shell panel.
export function ScrollFadePreview(props: {
  lines?: string[];
}): React.JSX.Element {
  return (
    <View
      className="w-full max-w-sm overflow-hidden rounded-xl bg-sidebar"
      style={previewStyle}
    >
      <View className="h-11 flex-row items-center px-4">
        <Text role="control">pnpm dev</Text>
      </View>
      <PreviewOutput lines={props.lines ?? outputLines} />
    </View>
  );
}

function PreviewOutput(props: { lines: string[] }): React.JSX.Element {
  return (
    <ScrollFadeView
      testID="scroll-fade-scroll"
      surfaceClassName="bg-sidebar"
      contentContainerClassName="px-4 pb-3"
    >
      {props.lines.map((line) => (
        <Text key={line} role="code">
          {line}
        </Text>
      ))}
    </ScrollFadeView>
  );
}
