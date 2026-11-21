import type {
  ItemsSlotItem,
  SlotItemsInput,
} from '@repo/contracts/plugins/wire';
import type { LeftOut } from './kept-items';

// What a worker answered for one Slot, by context key.
export type Kept = Map<string, readonly ItemsSlotItem[]>;

/*
 * One worker generation's items Slots: what it answered, by Slot id then context key, and why a Slot
 * left it out; both kept until the worker ends or says what it shows changed.
 */
export type SlotWorker = {
  generation: number;
  // Bumped on every change signal, so an answer asked for before it is never kept.
  epoch: number;
  kept: Map<string, Kept>;
  // An outstanding late call blocks another ask for its contexts until the call lands.
  late: Set<SlotItemsInput>;
  // A thrown or invalid answer leaves out the Slot until it changes.
  failed: Map<string, LeftOut>;
};
