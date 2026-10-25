import {
  itemsSlot,
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

// One worker generation: what it answered, by Slot id then context key, kept until it ends or says they changed.
export type Worker = Caller & {
  running: boolean;
  // Bumped on every change signal, so an answer asked for before it is never kept.
  epoch: number;
  kept: Map<string, Kept>;
};

type Ask = (input: SlotItemsInput) => Promise<Reply>;

// The context's key, as the Slot entry names it.
export const contextKey = (
  { content }: AnyItemsSlot,
  context: ItemsContext,
): string => String(context[content.key]);

// Answers a list from what the worker kept, asking it once for every context it has not answered.
export async function keptAnswer(
  worker: Worker,
  input: SlotItemsInput,
  ask: Ask,
): Promise<ItemsAnswer> {
  const entry = entryOf(input);
  const kept = keptOf(worker, entry);

  const asked = await askMissing(
    { worker, entry, ask },
    missingOf(entry, kept, input),
  );

  if (!asked.ok) return asked;

  const known = new Map([...kept, ...Object.entries(asked.items)]);

  return { ok: true, items: itemsFor(entry, known, input) };
}

type Asking = { worker: Worker; entry: AnyItemsSlot; ask: Ask };

async function askMissing(
  { worker, entry, ask }: Asking,
  input: SlotItemsInput,
): Promise<ItemsAnswer> {
  if (!input.contexts.length) return { ok: true, items: {} };

  const { epoch } = worker;
  const answer = checked(entry, await ask(input));

  if (worker.epoch === epoch) keep(keptOf(worker, entry), answer);

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

const answerSchema = ({ content }: AnyItemsSlot): z.ZodType<PluginItems> =>
  z.record(z.string(), z.array(content.item).max(content.limit.perPlugin));

function entryOf({ slotId }: SlotItemsInput): AnyItemsSlot {
  const entry = itemsSlot(slotId);

  if (!entry) throw new Error(`${slotId} is not an items Slot`);

  return entry;
}

function keptOf(worker: Worker, entry: AnyItemsSlot): Kept {
  const kept = worker.kept.get(entry.id) ?? new Map();

  worker.kept.set(entry.id, kept);

  return kept;
}

const missingOf = (
  entry: AnyItemsSlot,
  kept: Kept,
  input: SlotItemsInput,
): SlotItemsInput => ({
  ...input,
  contexts: input.contexts.filter(
    (context) => !kept.has(contextKey(entry, context)),
  ),
});

// A context the answer leaves out has no items, and is kept as such.
function keep(kept: Kept, answer: ItemsAnswer): void {
  if (!answer.ok) return;

  for (const [key, answered] of Object.entries(answer.items))
    kept.set(key, answered);
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
