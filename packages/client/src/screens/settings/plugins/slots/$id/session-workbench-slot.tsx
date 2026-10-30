import { sessionWorkbenchSlotId } from '@repo/contracts/plugins/declared-slots';
import { LiveWorkbenchPreview } from './session-workbench-preview';
import type { SlotDetail } from './slot-detail';

export const sessionWorkbenchSlot: SlotDetail = {
  slotId: sessionWorkbenchSlotId,
  title: 'Workbench cards',
  showTitle: 'Show in the Workbench',
  previewCaption: 'the cards Plugins add to a Session’s Workbench',
  Preview: LiveWorkbenchPreview,
};
