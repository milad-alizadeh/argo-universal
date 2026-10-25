import type { ComponentType } from 'react';
import type { PluginRenderContext } from './kit';
import type { PluginSlotInput, SlotItems, SlotItemsInput } from './wire';

// What a Plugin registers in a Slot: a component for a Slot that holds a page, a provider for an items Slot.
export type SlotContent = ComponentType<{
  context: PluginSlotInput['context'] & PluginRenderContext;
}>;

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

type SlotRegistration = {
  (slotId: PluginSlotInput['slotId'], content: SlotContent): void;
  <Id extends ItemsSlotId>(slotId: Id, provider: SlotItemsProvider<Id>): void;
};

export type SlotsApi = Readonly<{
  register: SlotRegistration;
  // Drops what Argo keeps of this Plugin's items in the Slot, so open lists ask again.
  changed: (slotId: ItemsSlotId) => Promise<void>;
}>;
