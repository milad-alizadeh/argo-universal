import { z } from 'zod';
import { tones } from '#kit-tokens';
import { PluginIcon, PluginPath } from '#plugin-manifest-fields';

// A Slot id is versioned, so a later context shape gets a new id instead of breaking Plugins (Grafana's extension points).
export const projectDetailsSlotId = 'argo/project/details/v1';

export const sessionRowSlotId = 'argo/session/row/v1';

export const toolCallSlotId = 'argo/feed/tool-call/v1';

export const messageSlotId = 'argo/feed/message/v1';

/*
 * How many items a Slot shows before "+N": on a phone (iOS, Android) and on a desktop (macOS, web).
 * `perPlugin` caps what one Plugin may send for one context, shown or not.
 */
export type SlotLimit = { phone: number; desktop: number; perPlugin: number };

// A Plugin page drawn with any kit components, as on the Plugin's own pages.
type TreeContent = { type: 'tree' };

/*
 * Items of a fixed shape, asked for once per list in one batched call keyed by `key` (ADR-0035). Argo
 * draws them after its own, in declared Plugin order, up to `limit`.
 */
export type ItemsContent<Key extends string, Item extends z.ZodObject> = {
  type: 'items';
  key: Key;
  item: Item;
  limit: SlotLimit;
};

// The cap on how many contexts one batched call names: a list longer than this asks again.
export const slotItemsListLimit = 500;

type Strict<Fields extends { readonly [field: string]: z.core.$ZodType }> =
  z.ZodObject<Fields, z.core.$strict>;

// One item as Argo serves it: the Plugin that sent it, and the item.
export type AttributedItem<Item extends z.ZodObject> = Strict<{
  pluginId: z.ZodString;
  item: Item;
}>;

// What one context of an items Slot shows, and the rest behind "+N", each with its Plugin.
export type MergedItems<Item extends z.ZodObject> = Strict<{
  items: z.ZodArray<AttributedItem<Item>>;
  overflow: z.ZodArray<AttributedItem<Item>>;
}>;

/*
 * An add-only Slot: every Plugin that declares it adds its own content, Argo's comes first and no
 * Plugin sees or changes another's (ADR-0035). `input` is what the App asks with.
 */
export type TreeSlot<Id extends string, Context extends z.ZodObject> = {
  id: Id;
  kind: 'add-only';
  content: TreeContent;
  input: Strict<{ slotId: z.ZodLiteral<Id>; context: Context }>;
};

export type ItemsSlot<
  Id extends string,
  Context extends z.ZodObject,
  Key extends string,
  Item extends z.ZodObject,
> = {
  id: Id;
  kind: 'add-only';
  content: ItemsContent<Key, Item>;
  context: Context;
  input: Strict<{ slotId: z.ZodLiteral<Id>; contexts: z.ZodArray<Context> }>;
  merged: MergedItems<Item>;
};

export type ReplaceableSlot<Id extends string> = {
  id: Id;
  kind: 'replaceable';
};

export function treeSlotEntry<Id extends string, Context extends z.ZodObject>(
  id: Id,
  context: Context,
): TreeSlot<Id, Context> {
  return {
    id,
    kind: 'add-only',
    content: { type: 'tree' },
    input: z.strictObject({ slotId: z.literal(id), context }),
  };
}

type ItemsSlotEntry = <
  Id extends string,
  Context extends z.ZodObject,
  Key extends keyof Context['shape'] & string,
  Item extends z.ZodObject,
>(
  id: Id,
  context: Context,
  content: Omit<ItemsContent<Key, Item>, 'type'>,
) => ItemsSlot<Id, Context, Key, Item>;

export const itemsSlotEntry: ItemsSlotEntry = (id, context, content) => ({
  id,
  kind: 'add-only',
  content: { type: 'items', ...content },
  context,
  input: itemsInput(id, context),
  merged: mergedItems(content.item),
});

// One batched call names at least one context, and at most `slotItemsListLimit`.
const itemsInput = <Id extends string, Context extends z.ZodObject>(
  id: Id,
  context: Context,
): ItemsSlot<Id, Context, string, z.ZodObject>['input'] =>
  z.strictObject({
    slotId: z.literal(id),
    contexts: z.array(context).min(1).max(slotItemsListLimit),
  });

function mergedItems<Item extends z.ZodObject>(item: Item): MergedItems<Item> {
  const attributed = z.strictObject({ pluginId: z.string(), item });

  return z.strictObject({
    items: z.array(attributed),
    overflow: z.array(attributed),
  });
}

const replaceable = <Id extends string>(id: Id): ReplaceableSlot<Id> => ({
  id,
  kind: 'replaceable',
});

// A Session row's meta text stays one short label beside Argo's own items; its tooltip, a sentence.
export const sessionRowTextLimit = 40;

export const sessionRowTooltipLimit = 200;

// One item on a Session row's meta line. Argo draws it; a Plugin never sends a kit tree here.
export const SessionRowItem = z.strictObject({
  icon: PluginIcon.optional(),
  text: z.string().trim().min(1).max(sessionRowTextLimit),
  tone: z.enum(tones).optional(),
  tooltip: z.string().trim().min(1).max(sessionRowTooltipLimit).optional(),
  // Opens this Plugin page when the item is pressed.
  action: z.strictObject({ path: PluginPath }).optional(),
});

export type SessionRowItem = z.infer<typeof SessionRowItem>;

// Every Slot is one entry: adding an entry is the whole job of adding a Slot.
export const addOnlySlots = [
  treeSlotEntry(
    projectDetailsSlotId,
    z.strictObject({ projectId: z.string().min(1) }),
  ),
  // The context carries only ids (ADR-0030); a Plugin reads a Session's branch through `argo.sessions.get`.
  itemsSlotEntry(
    sessionRowSlotId,
    z.strictObject({
      sessionId: z.string().min(1),
      projectId: z.string().min(1),
    }),
    {
      key: 'sessionId',
      item: SessionRowItem,
      limit: { phone: 1, desktop: 3, perPlugin: 8 },
    },
  ),
] as const;

// Replaceable Slots carry props, not a context; Plugins reach them through `ui.render` (ADR-0027).
export const replaceableSlots = [
  replaceable(toolCallSlotId),
  replaceable(messageSlotId),
] as const;
