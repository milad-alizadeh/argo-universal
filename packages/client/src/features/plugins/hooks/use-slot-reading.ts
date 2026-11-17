import type { SlotInputOf } from '@repo/contracts/plugins/wire';
import type { SlotVisibility } from '#features/settings';
import {
  type ItemsSlotId,
  readSlotItems,
  sentFor,
  type SlotEntry,
  type SlotReading,
} from '../utils/slot-items';
import { useSlotItems } from './use-slot-items';
import { useSlotReader } from './use-slot-reader';

/*
 * What a screen asks of an items Slot: its input, the context to read, and, on the Slot's Settings page, the choices
 * on the page.
 */
interface SlotReadingOf<Id extends ItemsSlotId> {
  input: SlotInputOf<Id> | undefined;
  key: string | undefined;
  visibility?: SlotVisibility;
}

/*
 * What one context of an items Slot shows on this Device: the Server's answer for `key`, read with this Device's
 * choices (or the override's). No input, or no answer yet, reads as an empty Slot.
 */
export function useSlotReading<Item, Id extends ItemsSlotId>(
  slot: SlotEntry<Item> & { id: Id },
  { input, key, visibility }: SlotReadingOf<Id>,
): SlotReading<Item> {
  const { items } = useSlotItems(input);
  const reader = useSlotReader(slot.id, visibility);

  return readSlotItems(slot, sentFor(items, key), reader);
}
