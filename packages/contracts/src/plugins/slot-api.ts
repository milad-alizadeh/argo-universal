import type { SlotItems, SlotItemsInput } from './wire';

type ItemsSlotId = SlotItemsInput['slotId'];

type ItemsContext<Id extends ItemsSlotId> = Extract<
  SlotItemsInput,
  { slotId: Id }
>['contexts'][number];

type SlotItem = SlotItems[string]['items'][number]['item'];

// A Plugin's items for one batched call, by each context's key; a key left out has none.
export type SlotItemsAnswer = Readonly<Record<string, readonly SlotItem[]>>;

/*
 * Answers one batched call for a whole list (ADR-0035, VS Code's `provideFileDecorations`). Argo
 * keeps the answer until the Plugin calls `argo.slots.changed`.
 */
export type SlotItemsProvider<Id extends ItemsSlotId = ItemsSlotId> = (
  request: Readonly<{ contexts: readonly Readonly<ItemsContext<Id>>[] }>,
) => SlotItemsAnswer | Promise<SlotItemsAnswer>;

// Every add-only Slot is an items Slot (ADR-0046): a Plugin registers a provider, never a component.
type SlotRegistration = <Id extends ItemsSlotId>(
  slotId: Id,
  provider: SlotItemsProvider<Id>,
) => void;

export type SlotsApi = Readonly<{
  register: SlotRegistration;
  // Drops what Argo keeps of this Plugin's items in the Slot, so open lists ask again.
  changed: (slotId: ItemsSlotId) => Promise<void>;
}>;
