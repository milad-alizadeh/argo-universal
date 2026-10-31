import { z } from 'zod';
import {
  addOnlySlots,
  replaceableSlots,
  type ItemsSlot,
  type ReplaceableSlot,
} from '#plugin-slot-registry';

export {
  addOnlySlots,
  itemsSlotEntry,
  mergedItems,
  replaceableSlots,
  messageSlotId,
  ProjectDetailsItem,
  projectDetailsRowLimit,
  projectDetailsSlotId,
  sessionActivitySlotId,
  SessionActivityItem,
  sessionBarSlotId,
  sessionRowSlotId,
  SessionRowItem,
  slotItemsListLimit,
  toolCallSlotId,
  type ItemsSlot,
  type SlotLimit,
} from '#plugin-slot-registry';

// An items Slot as the registry holds it, whatever its context and item.
export type AnyItemsSlot = ItemsSlot<string, z.ZodObject, string, z.ZodObject>;

// One context of an items Slot, and one item a Plugin answers for it, whatever the Slot.
export type ItemsContext = z.output<AnyItemsSlot['context']>;

export type ItemsSlotItem = z.output<AnyItemsSlot['content']['item']>;

type AddOnlyEntries = readonly AnyItemsSlot[];

type ReplaceableEntries = readonly ReplaceableSlot<string>[];

type Ids<Entries extends readonly { id: string }[]> = Entries[number]['id'];

type ItemsOf<Entries extends AddOnlyEntries> = Extract<
  Entries[number],
  AnyItemsSlot
>;

export type SlotSchemas<
  AddOnly extends AddOnlyEntries,
  Replaceable extends ReplaceableEntries,
> = {
  AddOnlySlotId: z.ZodLiteral<Ids<AddOnly>>;
  ReplaceableSlotId: z.ZodLiteral<Ids<Replaceable>>;
  SlotId: z.ZodLiteral<Ids<AddOnly> | Ids<Replaceable>>;
  // What an App asks an items Slot with: one batched call per list.
  SlotItemsInput: z.ZodUnion<ItemsOf<AddOnly>['input'][]>;
  // What an items Slot answers, by each context's key.
  SlotItems: z.ZodRecord<z.ZodString, z.ZodUnion<ItemsOf<AddOnly>['merged'][]>>;
  itemsSlot: (slotId: string) => ItemsOf<AddOnly> | undefined;
};

const ids = <Entries extends readonly { id: string }[]>(
  entries: Entries,
): Ids<Entries>[] => entries.map(({ id }) => id);

const isItems = <Entries extends AddOnlyEntries>(
  entry: Entries[number],
): entry is ItemsOf<Entries> => entry.content.type === 'items';

type IdSchemas<
  AddOnly extends AddOnlyEntries,
  Replaceable extends ReplaceableEntries,
> = Pick<
  SlotSchemas<AddOnly, Replaceable>,
  'AddOnlySlotId' | 'ReplaceableSlotId' | 'SlotId'
>;

type EntrySchemas<AddOnly extends AddOnlyEntries> = Omit<
  SlotSchemas<AddOnly, ReplaceableEntries>,
  keyof IdSchemas<AddOnly, ReplaceableEntries>
>;

function idSchemas<
  const AddOnly extends AddOnlyEntries,
  const Replaceable extends ReplaceableEntries,
>(addOnly: AddOnly, replaceable: Replaceable): IdSchemas<AddOnly, Replaceable> {
  return {
    AddOnlySlotId: z.literal(ids(addOnly)),
    ReplaceableSlotId: z.literal(ids(replaceable)),
    SlotId: z.literal([...ids(addOnly), ...ids(replaceable)]),
  };
}

function entrySchemas<const AddOnly extends AddOnlyEntries>(
  addOnly: AddOnly,
): EntrySchemas<AddOnly> {
  const items = addOnly.filter(isItems<AddOnly>);

  return {
    SlotItemsInput: z.union(items.map(({ input }) => input)),
    SlotItems: z.record(z.string(), z.union(items.map(({ merged }) => merged))),
    itemsSlot: (slotId) => items.find(({ id }) => id === slotId),
  };
}

// Everything a Slot id is checked against is read off the entries, so a new entry needs no edit here.
export function slotSchemas<
  const AddOnly extends AddOnlyEntries,
  const Replaceable extends ReplaceableEntries,
>(
  addOnly: AddOnly,
  replaceable: Replaceable,
): SlotSchemas<AddOnly, Replaceable> {
  return { ...idSchemas(addOnly, replaceable), ...entrySchemas(addOnly) };
}

const slots = slotSchemas(addOnlySlots, replaceableSlots);

export const slotRegistry = [...addOnlySlots, ...replaceableSlots] as const;

export const {
  AddOnlySlotId,
  ReplaceableSlotId,
  SlotId,
  SlotItemsInput,
  SlotItems,
  itemsSlot,
} = slots;

export type AddOnlySlotId = z.infer<typeof AddOnlySlotId>;

export type ReplaceableSlotId = z.infer<typeof ReplaceableSlotId>;

export type SlotId = z.infer<typeof SlotId>;

export type SlotItemsInput = z.infer<typeof SlotItemsInput>;

export type SlotItems = z.infer<typeof SlotItems>;

// One items Slot's own batched call: a Slot takes only the contexts its own entry declares.
export type SlotInputOf<Id extends AddOnlySlotId> = Extract<
  SlotItemsInput,
  { slotId: Id }
>;

// One context of one items Slot, such as a Session for the Session row Slots and a Project for Project details.
export type SlotContextOf<Id extends AddOnlySlotId> =
  SlotInputOf<Id>['contexts'][number];

/*
 * The same batched call for fewer contexts, such as the ones no answer is held for yet. The Slot id stays
 * the one it was, so the contexts stay the ones that Slot takes.
 */
export function withContexts<Input extends SlotItemsInput>(
  input: Input,
  contexts: Input['contexts'],
): Input {
  return { ...input, contexts };
}
