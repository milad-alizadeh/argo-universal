import { sessionHeaderSlotId } from '@repo/contracts/plugins/wire';
import { LiveSessionHeaderPreview } from './session-header-preview';
import type { SlotDetail } from './slot-detail';

export const sessionHeaderSlot: SlotDetail = {
  slotId: sessionHeaderSlotId,
  title: 'Session header',
  showTitle: 'Show in Session header',
  previewCaption: 'the Session header’s actions with these settings',
  Preview: LiveSessionHeaderPreview,
};
