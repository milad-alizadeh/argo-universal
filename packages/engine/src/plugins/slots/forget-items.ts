import {
  itemsSlot,
  type AnyItemsSlot,
  type SlotItemsInput,
} from '@repo/contracts/plugins/wire';
import { contextKey } from './kept-items';
import type { SlotWorker } from './slot-worker';

// Drops what the worker kept for the contexts one list shows, and the failure that left its Slot out; other contexts stay.
export function forget(
  worker: SlotWorker,
  { slotId, contexts }: Pick<SlotItemsInput, 'slotId' | 'contexts'>,
): void {
  const entry = itemsSlot(slotId);

  if (entry) dropContexts(worker, entry, contexts);
}

function dropContexts(
  worker: SlotWorker,
  entry: AnyItemsSlot,
  contexts: SlotItemsInput['contexts'],
): void {
  const kept = worker.kept.get(entry.id);

  for (const context of contexts) kept?.delete(contextKey(entry, context));
  worker.failed.delete(entry.id);
}
