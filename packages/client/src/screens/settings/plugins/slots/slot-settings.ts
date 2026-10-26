import type { AddOnlySlotId } from '@repo/contracts/plugins/wire';
import type { Tone } from '@repo/kit/primitives/content/text';
import type * as React from 'react';

// What the preview shows of one Plugin in the Slot.
export interface SlotSample {
  text: string;
  tone?: Tone;
}

/*
 * What a Slot's preview draws: the samples of the Plugins that are on, in the Plugins' order, and what the Plugin
 * that took over the replaceable part writes there, left out while the part is Argo's.
 */
export interface SlotPreviewProps {
  samples: SlotSample[];
  part?: string;
}

// The one part of a Slot a single Plugin may write instead of Argo, such as a Session row's Activity line.
export interface SlotPart {
  title: string;
  // What Argo writes there while no Plugin does.
  argoSubtitle: string;
}

/*
 * One Slot's page under Settings › Plugins, declared once: the page draws the Slot's own component as the preview,
 * a switch per Plugin that fills the Slot, and a choice of writer for its replaceable part when it has one.
 */
export interface SlotSettings {
  slotId: AddOnlySlotId;
  // The page's path under /settings/plugins/slots/.
  path: string;
  title: string;
  showTitle: string;
  // What the preview stands for, after "Preview ·" on a wide pane.
  previewCaption: string;
  Preview: React.ComponentType<SlotPreviewProps>;
  part?: SlotPart;
}
