import type {
  AddOnlySlotId,
  DeclaredSlotId,
} from '@repo/contracts/plugins/wire';
import type * as React from 'react';
import type { SlotVisibility } from '#features/settings';

// A Slot a page can be for: one whose Plugins answer at run time, or one their manifests fill.
export type SlotDetailId = AddOnlySlotId | DeclaredSlotId;

// What a Slot's preview is drawn with: what the Slot shows under the choices on the page.
export interface SlotPreviewProps {
  visibility: SlotVisibility;
}

// The Single-owner Slot chosen on a Slot's page, such as a Session row's Activity line.
export interface OwnerSlot {
  slotId: AddOnlySlotId;
  title: string;
  // What Argo writes there while no Plugin does.
  argoSubtitle: string;
}

/*
 * One Slot's page under Settings › Plugins, declared once: the page draws the Slot's own component as the preview,
 * a switch per Plugin that fills the Slot, and a choice of writer for its Single-owner Slot when it has one.
 */
export interface SlotDetail {
  slotId: SlotDetailId;
  title: string;
  showTitle: string;
  // What the preview stands for, after "Preview ·" on a wide pane.
  previewCaption: string;
  // The Slot's own component with the Plugins' answers for a real context.
  Preview: React.ComponentType<SlotPreviewProps>;
  ownerSlot?: OwnerSlot;
}
