import { Text } from '@repo/kit/primitives/content/text';
import { Surface } from '@repo/kit/primitives/layout/surface';
import type * as React from 'react';
import { View } from 'react-native';
import type {
  PreviewItem,
  SessionRowPreviewContent,
} from './session-rows-model';
import { previewCaption } from './session-rows-preview-caption';

// One specimen Session row, pinned above the switches so every choice below shows its effect at once.
export const SessionRowsPreview = (
  props: SessionRowPreviewContent,
): React.JSX.Element => (
  <Surface kind="card" padding={4}>
    <View className="gap-2">
      <Text role="secondary" tone="muted">
        {previewCaption}
      </Text>
      {/* A flat tile, as a row sits on the list: no tray shadow. */}
      <View className="rounded-xl bg-muted p-3">
        <SpecimenRow {...props} />
      </View>
    </View>
  </Surface>
);

const SpecimenRow = (props: SessionRowPreviewContent): React.JSX.Element => (
  <View
    accessible
    accessibilityLabel={rowLabel(props)}
    className="flex-row gap-2.5"
  >
    <View className="mt-1 size-4 rounded-full bg-border" />
    <SpecimenText {...props} />
  </View>
);

const rowLabel = ({ title, activity }: SessionRowPreviewContent): string =>
  `${title}, ${activity}`;

const SpecimenText = (props: SessionRowPreviewContent): React.JSX.Element => (
  <View className="min-w-0 flex-1">
    <Text role="heading" aria-level={3}>
      {props.title}
    </Text>
    <Text role="secondary" tone="muted">
      {props.activity}
    </Text>
    <MetaLine items={props.items} />
  </View>
);

const MetaLine = (props: { items: PreviewItem[] }): React.JSX.Element => (
  <View className="flex-row flex-wrap items-center gap-x-1.5">
    {props.items.flatMap(metaItem)}
  </View>
);

// Each item after the first follows a dot, as Argo's own meta items do.
const metaItem = (item: PreviewItem, index: number): React.JSX.Element[] => [
  ...(index > 0 ? [dot(item.text)] : []),
  <Text key={item.text} role="secondary" tone={item.tone ?? 'muted'}>
    {item.text}
  </Text>,
];

const dot = (before: string): React.JSX.Element => (
  <Text key={`dot-${before}`} role="secondary" tone="muted">
    ·
  </Text>
);
