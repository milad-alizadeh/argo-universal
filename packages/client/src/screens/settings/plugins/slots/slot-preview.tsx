import { Text } from '@repo/kit/primitives/content/text';
import { Surface } from '@repo/kit/primitives/layout/surface';
import type * as React from 'react';
import { View } from 'react-native';
import type { SlotVisibility } from '#features/settings';
import { previewCaptionOf } from './slot-preview-caption';
import type { SlotSettings } from './slot-settings';

type SlotPreviewCardProps = {
  settings: SlotSettings;
  visibility: SlotVisibility;
};

// The Slot's own component, pinned above the switches so every choice below shows its effect at once.
export const SlotPreview = ({
  settings: { Preview, previewCaption },
  visibility,
}: SlotPreviewCardProps): React.JSX.Element => (
  <Surface kind="card" padding={4}>
    <View className="gap-2">
      <Text role="secondary" tone="muted">
        {previewCaptionOf(previewCaption)}
      </Text>
      <Preview visibility={visibility} />
    </View>
  </Surface>
);
