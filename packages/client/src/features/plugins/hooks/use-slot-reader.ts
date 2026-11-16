import { useMemo } from 'react';
import { type SlotVisibility, useSlotVisibility } from '#features/settings';
import {
  type ItemsSlotId,
  type SlotReader,
  slotReader,
} from '../utils/slot-items';
import { usePluginLookup } from './use-plugin-names';

/*
 * Who reads an items Slot on this Device: its choices and the Plugins' names. The Slot's Settings page passes the
 * choices on the page instead, and they win over the saved ones.
 */
export function useSlotReader(
  slotId: ItemsSlotId,
  visibilityOverride?: SlotVisibility,
): SlotReader {
  const saved = useSlotVisibility(slotId);
  const lookup = usePluginLookup();

  return useMemo(
    () => slotReader(saved, visibilityOverride, lookup),
    [saved, visibilityOverride, lookup],
  );
}
