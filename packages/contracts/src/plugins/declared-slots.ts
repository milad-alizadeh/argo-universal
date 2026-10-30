import { z } from 'zod';
import { PluginIdentifier } from '#plugin-identifier';
import {
  SessionHeaderAction,
  sessionHeaderSlotId,
} from '#plugin-session-header-action';
import {
  SessionWorkbenchCard,
  sessionWorkbenchSlotId,
} from '#plugin-session-workbench-card';

export {
  SessionHeaderAction,
  sessionHeaderSlotId,
  SessionHeaderTarget,
} from '#plugin-session-header-action';

export {
  SessionWorkbenchCard,
  sessionWorkbenchSlotId,
} from '#plugin-session-workbench-card';

/*
 * Where a Slot that does not draw all of its items at once splits them: up to `limit` of the items `shown` sit in
 * the place the Slot names, and the rest go behind Argo's "…".
 */
export type DeclaredPlacement<Item extends z.ZodObject> = {
  limit: { phone: number; desktop: number };
  shown: (item: z.output<Item>) => boolean;
};

/*
 * Items a Plugin lists in its manifest under `contributes.declared`, so the App draws them without starting the
 * Plugin (ADR-0025 lazy start, ADR-0035). A Slot that draws every item it is given, as the Workbench's cards are,
 * has no `placement`.
 */
export type DeclaredContent<Item extends z.ZodObject> = {
  item: Item;
  // At most this many of the Slot's items from one Plugin; a manifest past it is refused.
  perPlugin: number;
  placement?: DeclaredPlacement<Item>;
};

export type DeclaredSlot<Id extends string, Item extends z.ZodObject> = {
  id: Id;
  kind: 'add-only';
  content: DeclaredContent<Item>;
};

// One Plugin's item for a declared Slot, as the Server lists it.
export type DeclaredItemOf<Slot extends DeclaredSlot<string, z.ZodObject>> = {
  pluginId: string;
  item: z.output<Slot['content']['item']>;
};

// The first Plugin header action sits as an icon before Argo’s "…" on a desktop; the rest, and all of them on a phone, go in "…" (#1122, option A).
export const sessionHeaderSlot = {
  id: sessionHeaderSlotId,
  kind: 'add-only',
  content: {
    item: SessionHeaderAction,
    perPlugin: 4,
    placement: {
      limit: { phone: 0, desktop: 1 },
      shown: (action) => action.placement === 'header',
    },
  },
} as const satisfies DeclaredSlot<
  typeof sessionHeaderSlotId,
  typeof SessionHeaderAction
>;

// One card per Plugin, after Argo's own, in Slot order (#1122, option A); the Workbench column scrolls, so no card is held back.
export const sessionWorkbenchSlot = {
  id: sessionWorkbenchSlotId,
  kind: 'add-only',
  content: { item: SessionWorkbenchCard, perPlugin: 1 },
} as const satisfies DeclaredSlot<
  typeof sessionWorkbenchSlotId,
  typeof SessionWorkbenchCard
>;

const uniqueIds = (items: readonly { id?: unknown }[]): boolean =>
  new Set(items.map(({ id }) => id)).size === items.length;

// One Plugin's items for one declared Slot: at most its per-Plugin limit, each id once.
const contribution = <Item extends z.ZodObject>({
  content,
}: DeclaredSlot<string, Item>): z.ZodArray<Item> =>
  z
    .array(content.item)
    .max(content.perPlugin)
    .refine(uniqueIds, 'Declared item ids must be unique');

// The declared Slots. A new one adds its id to each schema below.
export const DeclaredSlotId = z.literal([
  sessionHeaderSlot.id,
  sessionWorkbenchSlot.id,
]);

export type DeclaredSlotId = z.infer<typeof DeclaredSlotId>;

// A manifest's declared contributions before the check that they hang together.
const declaredContributions = z.strictObject({
  [sessionHeaderSlot.id]: contribution(sessionHeaderSlot).optional(),
  [sessionWorkbenchSlot.id]: contribution(sessionWorkbenchSlot).optional(),
});

type Declared = z.output<typeof declaredContributions>;

// What the Plugin's own header actions open: the cards they name.
const cardTargets = (declared: Declared): readonly string[] =>
  (declared[sessionHeaderSlotId] ?? []).flatMap(({ target }) =>
    target.type === 'card' ? [target.cardId] : [],
  );

const declaredCards = (declared: Declared): readonly string[] =>
  (declared[sessionWorkbenchSlotId] ?? []).map(({ id }) => id);

// An action opens a card of the Plugin's own, so core has a card to draw when it is pressed.
const targetsDeclaredCards = (declared: Declared): boolean => {
  const cards = declaredCards(declared);

  return cardTargets(declared).every((cardId) => cards.includes(cardId));
};

// A manifest's `contributes.declared`, keyed by Slot id.
export const DeclaredContributions = declaredContributions.refine(
  targetsDeclaredCards,
  {
    message: 'A header action must target a Workbench card the Plugin declares',
    path: [sessionHeaderSlot.id],
  },
);

// What an App asks a declared Slot with: its id alone, since nothing in it depends on where it is drawn.
export const DeclaredItemsInput = z.strictObject({ slotId: DeclaredSlotId });

export type DeclaredItemsInput = z.infer<typeof DeclaredItemsInput>;

// Every enabled Plugin's items in Slot order, each with its Plugin; the Slot they belong to is the one the App asked for.
export const DeclaredItems = z.array(
  z.strictObject({
    pluginId: PluginIdentifier,
    item: z.union([
      sessionHeaderSlot.content.item,
      sessionWorkbenchSlot.content.item,
    ]),
  }),
);

export type DeclaredItems = z.infer<typeof DeclaredItems>;

const declaredSlots = [sessionHeaderSlot, sessionWorkbenchSlot] as const;

export const declaredSlot = (
  slotId: string,
): (typeof declaredSlots)[number] | undefined =>
  declaredSlots.find(({ id }) => id === slotId);
