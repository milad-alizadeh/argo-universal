import type { ItemsSlotItem } from '@repo/contracts/plugins/wire';
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
  /*
   * A Plugin that threw or answered off-schema is not asked again, nor waited on, until it changes. One that ran late
   * is not asked again for the contexts it lacks until its late call lands.
   */
  failed: Map<string, LeftOut>;
};
