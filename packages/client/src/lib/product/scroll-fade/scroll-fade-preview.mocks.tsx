import { Text } from '@repo/kit/primitives/content/text';
import type * as React from 'react';
import { View } from 'react-native';
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

const rowLabels = [
  'All',
  'Running',
  'Waiting',
  'Done',
  'Archived',
  'Pinned',
  'Shared',
];

function RowLabel({ label }: { label: string }): React.JSX.Element {
  return (
    <View className="rounded-full bg-muted px-3 py-1">
      <Text role="control">{label}</Text>
    </View>
  );
}

function RowLabels({ labels }: { labels: string[] }): React.JSX.Element {
  return (
    <ScrollFadeView
      horizontal
      testID="scroll-fade-row"
      showsHorizontalScrollIndicator={false}
      contentContainerClassName="gap-2 px-4"
    >
      {labels.map((label) => (
        <RowLabel key={label} label={label} />
      ))}
    </ScrollFadeView>
  );
}

// A narrow row of labels that scrolls sideways, like a phone's filter pills.
export function ScrollFadeRowPreview({
  labels = rowLabels,
}: {
  labels?: string[];
}): React.JSX.Element {
  return (
    <View className="w-full max-w-60 rounded-xl bg-content py-3">
      <RowLabels labels={labels} />
    </View>
  );
}
