import { z } from 'zod';
import { tones } from '#kit-tokens';
import { PluginIcon, PluginPath } from '#plugin-manifest-fields';
import { SessionBarItem } from '#plugin-session-bar-item';

// A Slot id is versioned, so a later context shape gets a new id instead of breaking Plugins (Grafana's extension points).
export const projectDetailsSlotId = 'argo/project/details/v1';

export const sessionRowSlotId = 'argo/session/row/v1';

export const sessionActivitySlotId = 'argo/session/activity/v1';

export const sessionBarSlotId = 'argo/session/bar/v1';

export const toolCallSlotId = 'argo/feed/tool-call/v1';

export const messageSlotId = 'argo/feed/message/v1';

/*
 * How many items a Slot shows before "+N": on a phone (iOS, Android) and on a desktop (macOS, web).
 * `perPlugin` caps what one Plugin may send for one context, shown or not.
 */
export type SlotLimit = { phone: number; desktop: number; perPlugin: number };

/*
 * Items of a fixed shape, asked for once per list in one batched call keyed by `key` (ADR-0035). Argo
 * draws them after its own, in declared Plugin order, up to `limit`.
 */
export type ItemsContent<Key extends string, Item extends z.ZodObject> = {
  type: 'items';
  key: Key;
  item: Item;
  limit: SlotLimit;
  /*
   * 'one' makes a Single-owner Slot: every declaring Plugin answers, and the App shows only the answer of the Plugin
   * the user chose, or Argo's own while none is chosen (ADR-0035).
   */
  owners?: 'one';
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

// One context's answer from an items Slot, as the App reads it back.
export function mergedItems<Item extends z.ZodObject>(
  item: Item,
): MergedItems<Item> {
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

// A Session row's Activity line as one Plugin writes it: one short line of text in place of Argo's.
export const SessionActivityItem = z.strictObject({
  text: z.string().trim().min(1).max(sessionRowTextLimit),
});

export type SessionActivityItem = z.infer<typeof SessionActivityItem>;

// A Session row's context: ids only (ADR-0030); a Plugin reads a Session's branch through `argo.sessions.get`.
const SessionRowContext = z.strictObject({
  sessionId: z.string().min(1),
  projectId: z.string().min(1),
});

// A Project details row's label and its trailing value both stay short: it is a settings row, not a paragraph.
export const projectDetailsTextLimit = 40;

// How many rows one Plugin may add to a Project.
export const projectDetailsRowLimit = 6;

/*
 * One row a Plugin adds to Project details. Argo draws it; a Plugin never sends a kit tree here (ADR-0046).
 * A row that writes carries an `action` and the Plugin draws the choice on the page it opens.
 */
export const ProjectDetailsItem = z.strictObject({
  icon: PluginIcon.optional(),
  title: z.string().trim().min(1).max(projectDetailsTextLimit),
  // The trailing value a settings row shows, such as the Tracker this Project chose.
  value: z.string().trim().min(1).max(projectDetailsTextLimit).optional(),
  tone: z.enum(tones).optional(),
  // Opens this Plugin page when the row is pressed.
  action: z.strictObject({ path: PluginPath }).optional(),
});

export type ProjectDetailsItem = z.infer<typeof ProjectDetailsItem>;

// A Project details context: the Project's id, which is also the key one batched call answers by.
const ProjectDetailsContext = z.strictObject({
  projectId: z.string().min(1),
});

// Every Slot is one entry: adding an entry is the whole job of adding a Slot.
export const addOnlySlots = [
  // Every row is the Plugin's own data and Argo draws it; the choice behind a row is a Plugin page (ADR-0046).
  itemsSlotEntry(projectDetailsSlotId, ProjectDetailsContext, {
    key: 'projectId',
    item: ProjectDetailsItem,
    limit: {
      phone: projectDetailsRowLimit,
      desktop: projectDetailsRowLimit,
      perPlugin: projectDetailsRowLimit,
    },
  }),
  itemsSlotEntry(sessionRowSlotId, SessionRowContext, {
    key: 'sessionId',
    item: SessionRowItem,
    limit: { phone: 1, desktop: 3, perPlugin: 8 },
  }),
  // Single-owner: each Plugin that asks answers one line per row; the App shows the chosen Plugin's.
  itemsSlotEntry(sessionActivitySlotId, SessionRowContext, {
    key: 'sessionId',
    item: SessionActivityItem,
    limit: { phone: 1, desktop: 1, perPlugin: 1 },
    owners: 'one',
  }),
  // One line under the Session header: the first Plugin in Slot order shows, the rest wait behind "+N" (ADR-0035).
  itemsSlotEntry(sessionBarSlotId, SessionRowContext, {
    key: 'sessionId',
    item: SessionBarItem,
    limit: { phone: 1, desktop: 1, perPlugin: 1 },
  }),
] as const;

// Replaceable Slots carry props, not a context; Plugins reach them through `ui.render` (ADR-0027).
export const replaceableSlots = [
  replaceable(toolCallSlotId),
  replaceable(messageSlotId),
] as const;
