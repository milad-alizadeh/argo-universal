import { sessionBarSlotId } from '@repo/contracts/plugins/wire';
import { LiveSessionBarPreview } from './session-bar-preview';
import type { SlotDetail } from './slot-detail';

export const sessionBarSlot: SlotDetail = {
  slotId: sessionBarSlotId,
  title: 'Session bar',
  showTitle: 'Show on the Session bar',
  previewCaption: 'how the latest Session’s bar looks with these settings',
  Preview: LiveSessionBarPreview,
};
