import { z } from 'zod';
import { PluginIdentifier } from '#plugin-identifier';
import {
  type DeclaredSlot,
  declaredSlots,
  sessionHeaderSlot,
} from '#plugin-slot-registry';

const uniqueIds = (items: readonly { id?: unknown }[]): boolean =>
  new Set(items.map(({ id }) => id)).size === items.length;

// One Plugin's items for one declared Slot: at most its per-Plugin limit, each id once.
const contribution = <Item extends z.ZodObject>({
  content,
}: DeclaredSlot<string, Item>) =>
  z
    .array(content.item)
    .max(content.limit.perPlugin)
    .refine(uniqueIds, 'Declared item ids must be unique');

// The declared Slots. A new one adds its id to each schema below.
export const DeclaredSlotId = z.literal([sessionHeaderSlot.id]);

export type DeclaredSlotId = z.infer<typeof DeclaredSlotId>;

// A manifest's `contributes.declared`, keyed by Slot id.
export const DeclaredContributions = z.strictObject({
  [sessionHeaderSlot.id]: contribution(sessionHeaderSlot).optional(),
});

// What an App asks a declared Slot with: its id alone, since nothing in it depends on where it is drawn.
export const DeclaredItemsInput = z.strictObject({ slotId: DeclaredSlotId });

export type DeclaredItemsInput = z.infer<typeof DeclaredItemsInput>;

// Every enabled Plugin's items in Slot order, each with its Plugin.
export const DeclaredItems = z.array(
  z.strictObject({
    pluginId: PluginIdentifier,
    item: sessionHeaderSlot.content.item,
  }),
);

export type DeclaredItems = z.infer<typeof DeclaredItems>;

export const declaredSlot = (
  slotId: string,
): (typeof declaredSlots)[number] | undefined =>
  declaredSlots.find(({ id }) => id === slotId);
