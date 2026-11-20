import {
  itemsSlot,
  withContexts,
  type AnyItemsSlot,
  type ItemsContext,
  type ItemsSlotItem,
  type SlotItemsInput,
} from '@repo/contracts/plugins/wire';
import { z } from 'zod';
import type { Kept, SlotWorker } from './slot-worker';

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

type Ask = (input: SlotItemsInput) => Promise<Reply>;

// The context's key, as the Slot entry names it.
export const contextKey = (
  { content }: AnyItemsSlot,
  context: ItemsContext,
): string => String(context[content.key]);

type Asking = { worker: SlotWorker; entry: AnyItemsSlot; ask: Ask };

// Answers a list from what the worker kept, asking it once for every context it has not answered.
export function keptAnswer(
  worker: SlotWorker,
  input: SlotItemsInput,
  ask: Ask,
): Promise<ItemsAnswer> {
  const entry = entryOf(input);
  const failed = worker.failed.get(entry.id);

  return failed && failed.reason !== itemsLeftOut.late
    ? Promise.resolve(failed)
    : knownAnswer({ worker, entry, ask }, input);
}

async function knownAnswer(
  asking: Asking,
  input: SlotItemsInput,
): Promise<ItemsAnswer> {
  const { worker, entry } = asking;
  const kept = keptOf(worker, entry);
  const asked = await askOrWait(asking, missingOf(entry, kept, input));

  if (!asked.ok) return asked;

  const known = new Map([...kept, ...Object.entries(asked.items)]);

  return { ok: true, items: itemsFor(entry, known, input) };
}

// While a late call is out (the one failure `keptAnswer` lets by), the contexts it lacks wait for it; kept ones answer.
const askOrWait = (
  asking: Asking,
  input: SlotItemsInput,
): Promise<ItemsAnswer> =>
  input.contexts.length > 0 && asking.worker.failed.has(asking.entry.id)
    ? Promise.resolve(leftOut(itemsLeftOut.late))
    : askMissing(asking, input);

async function askMissing(
  { worker, entry, ask }: Asking,
  input: SlotItemsInput,
): Promise<ItemsAnswer> {
  if (!input.contexts.length) return { ok: true, items: {} };

  const { epoch } = worker;
  const answer = requested(entry, input, checked(entry, await ask(input)));

  if (worker.epoch === epoch) remember(worker, entry, answer);

  return answer;
}

// A late call came to an end: kept or left out as one in time is, and asked again if it ran out at the late limit too.
export function keepLate(
  worker: SlotWorker,
  input: SlotItemsInput,
  reply: Reply,
): ItemsAnswer {
  const entry = entryOf(input);
  const answer = requested(entry, input, checked(entry, reply));

  worker.failed.delete(entry.id);

  if (answer.ok || answer.reason !== itemsLeftOut.late)
    remember(worker, entry, answer);

  return answer;
}

// What a Plugin may answer: items of the Slot's shape, at most `perPlugin` for one context.
function checked(entry: AnyItemsSlot, reply: Reply): ItemsAnswer {
  if (!reply.ok) return reply;

  const parsed = answerSchema(entry).safeParse(reply.items);

  return parsed.success
    ? { ok: true, items: parsed.data }
    : leftOut(itemsLeftOut.schema);
}

// Only the contexts asked for are kept, each with no items when the answer leaves it out.
function requested(
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

function entryOf({ slotId }: SlotItemsInput): AnyItemsSlot {
  const entry = itemsSlot(slotId);

  if (!entry) throw new Error(`${slotId} is not an items Slot`);

  return entry;
}

function keptOf(worker: SlotWorker, entry: AnyItemsSlot): Kept {
  const kept = worker.kept.get(entry.id) ?? new Map();

  worker.kept.set(entry.id, kept);

  return kept;
}

const missingOf = (
  entry: AnyItemsSlot,
  kept: Kept,
  input: SlotItemsInput,
): SlotItemsInput =>
  withContexts(
    input,
    input.contexts.filter((context) => !kept.has(contextKey(entry, context))),
  );

function remember(
  worker: SlotWorker,
  entry: AnyItemsSlot,
  answer: ItemsAnswer,
): void {
  if (answer.ok) keep(keptOf(worker, entry), answer.items);
  else worker.failed.set(entry.id, answer);
}

function keep(kept: Kept, items: PluginItems): void {
  for (const [key, answered] of Object.entries(items)) kept.set(key, answered);
}

const itemsFor = (
  entry: AnyItemsSlot,
  known: Kept,
  input: SlotItemsInput,
): PluginItems =>
  Object.fromEntries(
    input.contexts.map((context) => {
      const key = contextKey(entry, context);

      return [key, known.get(key) ?? []];
    }),
  );
