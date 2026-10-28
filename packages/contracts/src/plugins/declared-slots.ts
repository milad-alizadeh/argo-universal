import { z } from 'zod';
import { PluginIdentifier } from '#plugin-identifier';
import {
  SessionHeaderAction,
  sessionHeaderSlotId,
} from '#plugin-session-header-action';
import type { SlotLimit } from '#plugin-slot-registry';

export {
  SessionHeaderAction,
  sessionHeaderSlotId,
  SessionHeaderTarget,
} from '#plugin-session-header-action';

/*
 * Items a Plugin lists in its manifest under `contributes.declared`, so the App draws them without starting the
 * Plugin (ADR-0025 lazy start, ADR-0035). On a desktop up to `limit.desktop` of the items `shown` sit beside Argo's
 * own; the rest, and every item on a phone, go behind Argo's "…".
 */
export type DeclaredContent<Item extends z.ZodObject> = {
  item: Item;
  limit: SlotLimit;
  shown: (item: z.output<Item>) => boolean;
};

export type DeclaredSlot<Id extends string, Item extends z.ZodObject> = {
  id: Id;
  kind: 'add-only';
  content: DeclaredContent<Item>;
};

// The first Plugin header action sits as an icon before Argo’s "…" on a desktop; the rest, and all of them on a phone, go in "…" (#1122, option A).
export const sessionHeaderSlot = {
  id: sessionHeaderSlotId,
  kind: 'add-only',
  content: {
    item: SessionHeaderAction,
    limit: { phone: 0, desktop: 1, perPlugin: 4 },
    shown: (action) => action.placement === 'header',
  },
} as const satisfies DeclaredSlot<
  typeof sessionHeaderSlotId,
  typeof SessionHeaderAction
>;

const uniqueIds = (items: readonly { id?: unknown }[]): boolean =>
  new Set(items.map(({ id }) => id)).size === items.length;

// One Plugin's items for one declared Slot: at most its per-Plugin limit, each id once.
const contribution = <Item extends z.ZodObject>({
  content,
}: DeclaredSlot<string, Item>): z.ZodArray<Item> =>
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

const declaredSlots = [sessionHeaderSlot] as const;

export const declaredSlot = (
  slotId: string,
): (typeof declaredSlots)[number] | undefined =>
  declaredSlots.find(({ id }) => id === slotId);
