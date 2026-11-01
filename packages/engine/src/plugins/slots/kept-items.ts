import {
  itemsSlot,
  withContexts,
  type AnyItemsSlot,
  type ItemsContext,
  type ItemsSlotItem,
  type SlotItemsInput,
} from '@repo/contracts/plugins/wire';
import { z } from 'zod';
import {
  itemsLeftOut,
  leftOut,
  type Caller,
  type LeftOut,
  type Reply,
} from './slot-item-calls';

// One Plugin's items for a list, by each context's key.
export type PluginItems = Readonly<Record<string, readonly ItemsSlotItem[]>>;

export type ItemsAnswer = { ok: true; items: PluginItems } | LeftOut;

type Kept = Map<string, readonly ItemsSlotItem[]>;

/*
 * One worker generation's items Slots: what it answered, by Slot id then context key, and why a Slot
 * left it out; both kept until the worker ends or says that Slot's items changed.
 */
export type SlotWorker = Caller & {
  running: boolean;
  // Bumped on every change signal, so an answer asked for before it is never kept.
  epoch: number;
  kept: Map<string, Kept>;
  // A Plugin that threw, ran late or answered off-schema is not asked again, nor waited on, until it changes.
  failed: Map<string, LeftOut>;
};

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

  return failed
    ? Promise.resolve(failed)
    : knownAnswer({ worker, entry, ask }, input);
}

async function knownAnswer(
  asking: Asking,
  input: SlotItemsInput,
): Promise<ItemsAnswer> {
  const { worker, entry } = asking;
  const kept = keptOf(worker, entry);
  const asked = await askMissing(asking, missingOf(entry, kept, input));

  if (!asked.ok) return asked;

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

  if (worker.epoch === epoch) remember(worker, entry, answer);

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

const answerSchema = ({ content }: AnyItemsSlot): z.ZodType<PluginItems> =>
  z.record(z.string(), z.array(content.item).max(content.limit.perPlugin));

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
