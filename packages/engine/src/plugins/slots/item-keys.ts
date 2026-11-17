import type {
  AnyItemsSlot,
  ItemsContext,
  ItemsSlotItem,
  SlotItemsInput,
} from '@repo/contracts/plugins/wire';

// The context's key, as the Slot entry names it.
export const contextKey = (
  { content }: AnyItemsSlot,
  context: ItemsContext,
): string => String(context[content.key]);

// Each context asked for, with the items known for it, or none.
export const itemsFor = (
  entry: AnyItemsSlot,
  known: ReadonlyMap<string, readonly ItemsSlotItem[]>,
  input: SlotItemsInput,
): Record<string, readonly ItemsSlotItem[]> =>
  Object.fromEntries(
    input.contexts.map((context) => {
      const key = contextKey(entry, context);

      return [key, known.get(key) ?? []];
    }),
  );
