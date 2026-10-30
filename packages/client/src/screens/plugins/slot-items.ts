import { addOnlySlots, type SlotItems } from '@repo/contracts/plugins/wire';
import type { SystemSymbolSource } from '@repo/kit/symbols/symbol-source';
import type { z } from 'zod';
import type { SlotVisibility } from '#features/settings';

// Every items Slot the registry holds; a Slot added there is read by this module without an edit to it.
type ItemsEntry = Extract<
  (typeof addOnlySlots)[number],
  { content: { type: 'items' } }
>;

type ItemsSlotId = ItemsEntry['id'];

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

/*
 * What one context of an items Slot shows on this Device: the items that fit, the rest behind "+N", and, in a
 * Single-owner Slot, the chosen Plugin's item. There is no owner while the Slot's line is Argo's own.
 */
export interface SlotReading<Item> {
  items: readonly ReadItem<Item>[];
  overflow: readonly ReadItem<Item>[];
  owner: ReadItem<Item> | undefined;
}

type Attributed<Item> = { pluginId: string; item: Item };

// One context's answer from an items Slot, parsed: what fit, then the rest.
type Answer<Item> = {
  items: readonly Attributed<Item>[];
  overflow: readonly Attributed<Item>[];
};

// What the reader needs of an items Slot's registry entry: the schema it parses with, and who may own its line.
type SlotEntry<Item> = {
  merged: z.ZodType<Answer<Item>>;
  content: { owners?: 'one' };
};

const noAnswer: Answer<never> = { items: [], overflow: [] };

// A Server that sent no answer for the context, or something the Slot's own schema rejects, gives none.
function sentAnswer<Item>(
  slot: SlotEntry<Item>,
  sent: SentItems,
): Answer<Item> {
  const parsed = slot.merged.safeParse(sent);

  return parsed.success ? parsed.data : noAnswer;
}

/*
 * The items of the Plugins left on, split as the Server split them: one hidden makes room for the next in line, up
 * to what the Server let fit, and the rest stay behind "+N".
 */
function shownItems<Item>(
  { items, overflow }: Answer<Item>,
  { shows }: SlotVisibility,
): Answer<Item> {
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

/*
 * The chosen Plugin's item in a Single-owner Slot, shown or not, so the Plugin that writes the line keeps it however
 * many items came before it. None in any other Slot, and none while the line is Argo's: a Plugin turned off is no
 * longer the owner, so it never writes the line.
 */
function ownerOf<Item>(
  slot: SlotEntry<Item>,
  answer: Answer<Item>,
  { owner }: SlotVisibility,
): Attributed<Item> | undefined {
  const writer = slot.content.owners === 'one' ? owner : null;

  return [...answer.items, ...answer.overflow].find(
    ({ pluginId }) => pluginId === writer,
  );
}

// Every item the reading carries, with its Plugin named.
const namedReading = <Item>(
  shown: Answer<Item>,
  owner: Attributed<Item> | undefined,
  lookup: PluginLookup,
): SlotReading<Item> => {
  const named = namedBy<Item>(lookup);

  return {
    items: shown.items.map((item) => named(item)),
    overflow: shown.overflow.map((item) => named(item)),
    owner: owner && named(owner),
  };
};

/*
 * The one reader of an items Slot: it parses the Server's answer with the Slot's own schema, leaves out the Plugins
 * this Device turned off — one hidden making room for the next in line — names every Plugin left, and picks the
 * chosen Plugin's item in a Single-owner Slot. A Slot's screen then only draws what comes back.
 */
export function readSlotItems<Item>(
  slot: SlotEntry<Item>,
  sent: SentItems,
  { visibility, lookup }: SlotReader,
): SlotReading<Item> {
  const answer = sentAnswer(slot, sent);

  return namedReading(
    shownItems(answer, visibility),
    ownerOf(slot, answer, visibility),
    lookup,
  );
}
