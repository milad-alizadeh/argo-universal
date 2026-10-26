import { sessionRowSlot } from './session-row-slot';
import type { SlotSettings } from './slot-settings';

// Every Slot with a page under Settings › Plugins: adding a Slot's page is adding its declaration here.
export const slotSettings: readonly SlotSettings[] = [sessionRowSlot];

export const findSlotSettings = (path: string): SlotSettings | undefined =>
  slotSettings.find((settings) => settings.path === path);
