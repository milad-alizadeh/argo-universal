import type {
  AnyItemsSlot,
  ItemsSlotItem,
  SlotItemsInput,
} from '@repo/contracts/plugins/wire';
import { contextKey, itemsFor } from './item-keys';

type Items = readonly ItemsSlotItem[];

// A context's last answer, with the epoch it was asked in.
type Last = { epoch: number; items: Items };

/*
 * What one worker generation last answered for each Slot and context. It outlives a change signal, so a late
 * answer draws this instead of nothing (ADR-0035), and an older answer landing late never replaces a newer one.
 */
export class LastItems {
  private readonly bySlot = new Map<string, Map<string, Last>>();

  // Keeps an answer asked for in `epoch`, for each context it names.
  keep(
    slotId: string,
    epoch: number,
    items: Readonly<Record<string, Items>>,
  ): void {
    const last = this.slot(slotId);

    for (const [key, answered] of Object.entries(items))
      if (isNewer(last.get(key), epoch))
        last.set(key, { epoch, items: answered });
  }

  // What was last answered for the contexts asked, none for one never answered; nothing when none of them was.
  answer(
    entry: AnyItemsSlot,
    input: SlotItemsInput,
  ): Record<string, Items> | undefined {
    const last = this.slot(entry.id);

    const known = input.contexts.some((context) =>
      last.has(contextKey(entry, context)),
    );

    if (!known) return undefined;

    const items = new Map([...last].map(([key, { items }]) => [key, items]));

    return itemsFor(entry, items, input);
  }

  private slot(slotId: string): Map<string, Last> {
    const last = this.bySlot.get(slotId) ?? new Map<string, Last>();

    this.bySlot.set(slotId, last);

    return last;
  }
}

const isNewer = (last: Last | undefined, epoch: number): boolean =>
  last === undefined || last.epoch <= epoch;
