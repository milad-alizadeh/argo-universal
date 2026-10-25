import { z } from 'zod';
import {
  addOnlySlots,
  replaceableSlots,
  type AddOnlySlot,
  type ReplaceableSlot,
  type SlotContentRule,
} from '#plugin-slot-registry';

export {
  messageSlotId,
  projectDetailsSlotId,
  sessionRowSlotId,
  toolCallSlotId,
  type SlotContentRule,
} from '#plugin-slot-registry';

type AddOnlyEntries = readonly AddOnlySlot<string, z.ZodObject>[];

type ReplaceableEntries = readonly ReplaceableSlot<string>[];

type Ids<Entries extends readonly { id: string }[]> = Entries[number]['id'];

export type SlotSchemas<
  AddOnly extends AddOnlyEntries,
  Replaceable extends ReplaceableEntries,
> = {
  AddOnlySlotId: z.ZodLiteral<Ids<AddOnly>>;
  ReplaceableSlotId: z.ZodLiteral<Ids<Replaceable>>;
  SlotId: z.ZodLiteral<Ids<AddOnly> | Ids<Replaceable>>;
  PluginSlotInput: z.ZodUnion<AddOnly[number]['input'][]>;
  // A Replaceable Slot, or a page with no Slot, takes any tree.
  contentRule: (
    slotId: Ids<AddOnly> | Ids<Replaceable> | undefined,
  ) => SlotContentRule;
};

const ids = <Entries extends readonly { id: string }[]>(
  entries: Entries,
): Ids<Entries>[] => entries.map(({ id }) => id);

const contentRule =
  (addOnly: AddOnlyEntries) =>
  (slotId: string | undefined): SlotContentRule =>
    addOnly.find(({ id }) => id === slotId)?.content ?? 'tree';

// Everything a Slot id is checked against is read off the entries, so a new entry needs no edit here.
export function slotSchemas<
  const AddOnly extends AddOnlyEntries,
  const Replaceable extends ReplaceableEntries,
>(
  addOnly: AddOnly,
  replaceable: Replaceable,
): SlotSchemas<AddOnly, Replaceable> {
  return {
    AddOnlySlotId: z.literal(ids(addOnly)),
    ReplaceableSlotId: z.literal(ids(replaceable)),
    SlotId: z.literal([...ids(addOnly), ...ids(replaceable)]),
    PluginSlotInput: z.union(addOnly.map(({ input }) => input)),
    contentRule: contentRule(addOnly),
  };
}

const slots = slotSchemas(addOnlySlots, replaceableSlots);

export const slotRegistry = [...addOnlySlots, ...replaceableSlots] as const;

export const {
  AddOnlySlotId,
  ReplaceableSlotId,
  SlotId,
  PluginSlotInput,
  contentRule: slotContentRule,
} = slots;

export type AddOnlySlotId = z.infer<typeof AddOnlySlotId>;

export type ReplaceableSlotId = z.infer<typeof ReplaceableSlotId>;

export type SlotId = z.infer<typeof SlotId>;

export type PluginSlotInput = z.infer<typeof PluginSlotInput>;

// Where a Slot's contribution lives inside its Plugin; page paths start with `/`, so the two never meet.
export function slotPath({ slotId, context }: PluginSlotInput): string {
  return `slot:${slotId}:${JSON.stringify(context)}`;
}
