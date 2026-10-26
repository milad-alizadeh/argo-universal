import { Text } from '@repo/kit/primitives/content/text';
import { Surface } from '@repo/kit/primitives/layout/surface';
import type * as React from 'react';
import { View } from 'react-native';
import { previewCaptionOf } from './slot-preview-caption';
import type { SlotPreviewProps, SlotSettings } from './slot-settings';

type SlotPreviewCardProps = SlotPreviewProps & {
  settings: SlotSettings;
};

// The Slot's own component, pinned above the switches so every choice below shows its effect at once.
export const SlotPreview = ({
  settings: { Preview, previewCaption },
  ...preview
}: SlotPreviewCardProps): React.JSX.Element => (
  <Surface kind="card" padding={4}>
    <View className="gap-2">
      <Text role="secondary" tone="muted">
        {previewCaptionOf(previewCaption)}
      </Text>
      <Preview {...preview} />
    </View>
  </Surface>
);
