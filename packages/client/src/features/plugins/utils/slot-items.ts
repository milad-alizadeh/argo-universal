import { addOnlySlots, type SlotItems } from '@repo/contracts/plugins/wire';
import type { SystemSymbolSource } from '@repo/kit/symbols/symbol-source';
import type { z } from 'zod';
import type { SlotVisibility } from '#features/settings';

// Every items Slot the registry holds; a Slot added there is read by this module without an edit to it.
type ItemsEntry = Extract<
  (typeof addOnlySlots)[number],
  { content: { type: 'items' } }
>;

export type ItemsSlotId = ItemsEntry['id'];

/*
 * The registry's entry for one items Slot, with the item that Slot answers; a Slot's screen names its Slot and the
 * reader finds everything else here. Only a registry id type-checks, so a missing entry is a broken registry.
 */
export function itemsSlotEntry<Id extends ItemsSlotId>(
  slotId: Id,
): Extract<ItemsEntry, { id: Id }> {
  const entry = addOnlySlots.find(
    (held): held is Extract<ItemsEntry, { id: Id }> =>
      held.id === slotId && held.content.type === 'items',
  );

  if (!entry) throw new Error(`The Slot registry has no items Slot ${slotId}`);

  return entry;
}

// One context's answer from one items Slot as the Server sent it; none when no Plugin answered for it.
export type SentItems = SlotItems[string] | undefined;

// A Plugin as a reader names it: its name, and its glyph, a generic Plugin glyph when it has none.
export interface PluginIdentity {
  name: string;
  icon: SystemSymbolSource;
}

export type PluginLookup = (pluginId: string) => PluginIdentity;

// Who reads a Slot: the choices that apply to it, and the Plugins' names on the connected Server.
export interface SlotReader {
  visibility: SlotVisibility;
  lookup: PluginLookup;
}

// One item an items Slot answered, with its Plugin already named for the reader.
export interface ReadItem<Item> {
  pluginId: string;
  pluginName: string;
  pluginIcon: SystemSymbolSource;
  item: Item;
}

// What one context of an items Slot shows on this Device: the items that fit, and the rest behind "+N".
export interface SlotReading<Item> {
  items: readonly ReadItem<Item>[];
  overflow: readonly ReadItem<Item>[];
}

type Attributed<Item> = { pluginId: string; item: Item };

// One context's answer from an items Slot, parsed: what fit, then the rest.
type KeptPage<Item> = {
  items: readonly Attributed<Item>[];
  overflow: readonly Attributed<Item>[];
};

// What the reader needs of an items Slot's registry entry: the schema it parses with.
export type SlotEntry<Item> = {
  merged: z.ZodType<KeptPage<Item>>;
};

const noAnswer: KeptPage<never> = { items: [], overflow: [] };

// A Server that sent no answer for the context, or something the Slot's own schema rejects, gives none.
function sentAnswer<Item>(
  slot: SlotEntry<Item>,
  sent: SentItems,
): KeptPage<Item> {
  const parsed = slot.merged.safeParse(sent);

  return parsed.success ? parsed.data : noAnswer;
}

/*
 * The items of the Plugins left on, split as the Server split them: one hidden makes room for the next in line, up
 * to what the Server let fit, and the rest stay behind "+N".
 */
function shownItems<Item>(
  { items, overflow }: KeptPage<Item>,
  { shows }: SlotVisibility,
): KeptPage<Item> {
  const left = [...items, ...overflow].filter(({ pluginId }) =>
    shows(pluginId),
  );

  return {
    items: left.slice(0, items.length),
    overflow: left.slice(items.length),
  };
}

const namedBy =
  <Item>(lookup: PluginLookup) =>
  ({ pluginId, item }: Attributed<Item>): ReadItem<Item> => {
    const { name, icon } = lookup(pluginId);

    return { pluginId, pluginName: name, pluginIcon: icon, item };
  };

// Every item the reading carries, with its Plugin named.
const namedReading = <Item>(
  shown: KeptPage<Item>,
  lookup: PluginLookup,
): SlotReading<Item> => {
  const named = namedBy<Item>(lookup);

  return {
    items: shown.items.map((item) => named(item)),
    overflow: shown.overflow.map((item) => named(item)),
  };
};

/*
 * The one reader of an items Slot: it parses the Server's answer with the Slot's own schema, leaves out the Plugins
 * this Device turned off — one hidden making room for the next in line — and names every Plugin left. A Slot's screen
 * then only draws what comes back.
 */
export function readSlotItems<Item>(
  slot: SlotEntry<Item>,
  sent: SentItems,
  { visibility, lookup }: SlotReader,
): SlotReading<Item> {
  return namedReading(shownItems(sentAnswer(slot, sent), visibility), lookup);
}

// What the Server sent for one context; none while there is no context to read.
export const sentFor = (
  items: SlotItems,
  key: string | undefined,
): SentItems => (key === undefined ? undefined : items[key]);

// The choices the reader applies: the ones passed in win over the saved ones.
export const slotReader = (
  saved: SlotVisibility,
  override: SlotVisibility | undefined,
  lookup: PluginLookup,
): SlotReader => ({ visibility: override ?? saved, lookup });
