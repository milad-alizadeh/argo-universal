import {
  itemsSlot,
  withContexts,
  type AnyItemsSlot,
  type ItemsSlotItem,
  type SlotItemsInput,
} from '@repo/contracts/plugins/wire';
import { z } from 'zod';
import { contextKey, itemsFor } from './item-keys';
import type { LastItems } from './last-items';

// Why a Plugin's items were left out; each is logged once per Plugin and Slot.
export const itemsLeftOut = {
  notRunning: 'Plugin is not running',
  late: 'items provider ran late',
  threw: 'items provider threw',
  schema: 'items failed the Slot schema',
} as const;

type LeftOut = {
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
 * One Plugin's items, or why it was left out. `late` marks items Argo answered from what the Plugin last
 * answered because this answer ran late (ADR-0035).
 */
export type ItemsAnswer =
  | { ok: true; items: PluginItems; late?: true }
  | LeftOut;

type Kept = Map<string, readonly ItemsSlotItem[]>;

/*
 * One worker generation's items Slots: what it answered, by Slot id then context key, and why a Slot
 * left it out; both kept until the worker ends or says what it shows changed. What it last answered
 * outlives a change signal, so a late answer draws that instead of nothing.
 */
export type SlotWorker = {
  generation: number;
  // Bumped on every change signal, so an answer asked for before it is never kept.
  epoch: number;
  kept: Map<string, Kept>;
  last: LastItems;
  // A Plugin that threw, ran late or answered off-schema is not asked again, nor waited on, until it changes.
  failed: Map<string, LeftOut>;
};

type Ask = (input: SlotItemsInput) => Promise<Reply>;

type Asking = { worker: SlotWorker; entry: AnyItemsSlot; ask: Ask };

type Answering = Omit<Asking, 'ask'> & { input: SlotItemsInput };

// Answers a list from what the worker kept, asking it once for every context it has not answered.
export function keptAnswer(
  worker: SlotWorker,
  input: SlotItemsInput,
  ask: Ask,
): Promise<ItemsAnswer> {
  const entry = entryOf(input);
  const failed = worker.failed.get(entry.id);

  return failed
    ? Promise.resolve(lastAnswer({ worker, entry, input }, failed))
    : knownAnswer({ worker, entry, ask }, input);
}

// A late Plugin is answered with what it last answered (ADR-0035); one that threw or answered off-schema is left out.
function lastAnswer(
  { worker, entry, input }: Answering,
  failed: LeftOut,
): ItemsAnswer {
  const items = worker.last.answer(entry, input);

  if (failed.reason !== itemsLeftOut.late || !items) return failed;

  return { ok: true, items, late: true };
}

async function knownAnswer(
  asking: Asking,
  input: SlotItemsInput,
): Promise<ItemsAnswer> {
  const { worker, entry } = asking;
  const kept = keptOf(worker, entry);
  const asked = await askMissing(asking, missingOf(entry, kept, input));

  if (!asked.ok) return lastAnswer({ worker, entry, input }, asked);

  const known = new Map([...kept, ...Object.entries(asked.items)]);

  return { ok: true, items: itemsFor(entry, known, input) };
}

async function askMissing(
  { worker, entry, ask }: Asking,
  input: SlotItemsInput,
): Promise<ItemsAnswer> {
  if (!input.contexts.length) return { ok: true, items: {} };

  const { epoch } = worker;
  const answer = requested(entry, input, checked(entry, await ask(input)));

  remember({ worker, entry }, epoch, answer);

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

// An answer a change overtook is not kept, but it is still the newest the Plugin gave, should the next run late.
function remember(
  { worker, entry }: Omit<Asking, 'ask'>,
  epoch: number,
  answer: ItemsAnswer,
): void {
  if (answer.ok) worker.last.keep(entry.id, epoch, answer.items);

  if (worker.epoch === epoch) keptOrFailed({ worker, entry }, answer);
}

function keptOrFailed(
  { worker, entry }: Omit<Asking, 'ask'>,
  answer: ItemsAnswer,
): void {
  if (answer.ok) keep(keptOf(worker, entry), answer.items);
  else worker.failed.set(entry.id, answer);
}

function keep(kept: Kept, items: PluginItems): void {
  for (const [key, answered] of Object.entries(items)) kept.set(key, answered);
}
