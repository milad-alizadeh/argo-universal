import { Text } from '@repo/kit/primitives/content/text';
import { Stack } from '@repo/kit/primitives/layout/stack';
import { Surface } from '@repo/kit/primitives/layout/surface';
import type * as React from 'react';
import type { SlotVisibility } from '#features/settings';
import type { SlotDetail } from './slot-detail';
import { previewCaptionOf } from './slot-preview-caption';

type SlotPreviewCardProps = {
  settings: SlotDetail;
  visibility: SlotVisibility;
};

// The Slot's own component, pinned above the switches so every choice below shows its effect at once.
export const SlotPreview = ({
  settings: { Preview, previewCaption },
  visibility,
}: SlotPreviewCardProps): React.JSX.Element => (
  <Surface kind="card" padding={4}>
    <Stack direction="column" gap={2}>
      <Text role="secondary" tone="muted">
        {previewCaptionOf(previewCaption)}
      </Text>
      <Preview visibility={visibility} />
    </Stack>
  </Surface>
);
