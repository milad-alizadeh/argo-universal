import { Card } from '@repo/kit/primitives/layout/card';
import type * as React from 'react';
import type { SlotVisibility } from '#features/settings';
import type { SlotDetail } from './slot-detail';
import { previewCaptionOf } from './slot-preview-caption';

type SlotPreviewProps = {
  settings: SlotDetail;
  visibility: SlotVisibility;
};

// The Slot's own component, pinned above the switches so every choice below shows its effect at once.
export const SlotPreview = ({
  settings: { Preview, previewCaption },
  visibility,
}: SlotPreviewProps): React.JSX.Element => (
  <Card title={previewCaptionOf(previewCaption)}>
    <Preview visibility={visibility} />
  </Card>
);
