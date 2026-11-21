import {
  itemsSlot,
  type AnyItemsSlot,
  type ItemsContext,
  type ItemsSlotItem,
  type SlotItemsInput,
} from '@repo/contracts/plugins/wire';
import { z } from 'zod';

// Why a Plugin's items were left out; each is logged once per Plugin and Slot.
export const itemsLeftOut = {
  notRunning: 'Plugin is not running',
  late: 'items provider ran late',
  threw: 'items provider threw',
  schema: 'items failed the Slot schema',
} as const;

export type LeftOut = {
  ok: false;
  reason: (typeof itemsLeftOut)[keyof typeof itemsLeftOut];
};

// What the worker answered for the contexts it was asked, or why it was left out.
export type Reply = { ok: true; items: unknown } | LeftOut;

export const leftOut = (reason: LeftOut['reason']): LeftOut => ({
  ok: false,
  reason,
});

// One Plugin's items for a list, by each context's key.
export type PluginItems = Readonly<Record<string, readonly ItemsSlotItem[]>>;

/*
 * What a list draws of one Plugin: its fresh items, why it was left out, or, when it was left out but answered
 * before, its last good items standing in (see `last-good-items.ts`).
 */
export type ItemsAnswer =
  | { ok: true; items: PluginItems }
  | { ok: true; items: PluginItems; standingInFor: LeftOut['reason'] }
  | LeftOut;

// The context's key, as the Slot entry names it.
export const contextKey = (
  { content }: AnyItemsSlot,
  context: ItemsContext,
): string => String(context[content.key]);

// What a Plugin may answer: items of the Slot's shape, at most `perPlugin` for one context.
export function checked(entry: AnyItemsSlot, reply: Reply): ItemsAnswer {
  if (!reply.ok) return reply;

  const parsed = answerSchema(entry).safeParse(reply.items);

  return parsed.success
    ? { ok: true, items: parsed.data }
    : leftOut(itemsLeftOut.schema);
}

// Only the contexts asked for are kept, each with no items when the answer leaves it out.
export function requested(
  entry: AnyItemsSlot,
  input: SlotItemsInput,
  answer: ItemsAnswer,
): ItemsAnswer {
  if (!answer.ok) return answer;

  const answered = new Map(Object.entries(answer.items));

  return { ok: true, items: itemsFor(entry, answered, input) };
}

const answerSchema = ({ content }: AnyItemsSlot): z.ZodType<PluginItems> => {
  const items = z.array(content.item);
  const limit = content.limit.perPlugin;

  return z.record(z.string(), limit === null ? items : items.max(limit));
};

export function entryOf({ slotId }: SlotItemsInput): AnyItemsSlot {
  const entry = itemsSlot(slotId);

  if (!entry) throw new Error(`${slotId} is not an items Slot`);

  return entry;
}

export const itemsFor = (
  entry: AnyItemsSlot,
  known: ReadonlyMap<string, readonly ItemsSlotItem[]>,
  input: SlotItemsInput,
): PluginItems =>
  Object.fromEntries(
    input.contexts.map((context) => {
      const key = contextKey(entry, context);

      return [key, known.get(key) ?? []];
    }),
  );
