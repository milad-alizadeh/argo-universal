import type {
  ItemsSlotItem,
  SlotItemsInput,
} from '@repo/contracts/plugins/wire';
import {
  itemsSlot,
  withContexts,
  type AnyItemsSlot,
} from '@repo/contracts/plugins/wire';
import {
  checked,
  contextKey,
  entryOf,
  itemsFor,
  itemsLeftOut,
  leftOut,
  requested,
  type ItemsAnswer,
  type LeftOut,
  type Reply,
} from './kept-items';
import { LastGoodItems } from './last-good-items';
import type { Shown } from './slot-refresh';

// What a worker answered for one Slot, by context key.
type Kept = Map<string, readonly ItemsSlotItem[]>;

/*
 * One worker generation's items Slots: what it answered, by Slot id then context key, and why a Slot
 * left it out; both kept until the worker ends or says what it shows changed.
 */
type SlotWorker = {
  generation: number;
  // Bumped on every change signal, so an answer asked for before it is never kept.
  epoch: number;
  kept: Map<string, Kept>;
  /*
   * A Plugin that threw or answered off-schema is not asked again, nor waited on, until it changes. One that ran late
   * is not asked again for the contexts it lacks until its late call lands.
   */
  failed: Map<string, LeftOut>;
};

// Asks the Plugin for the contexts it has not answered; `late` takes the reply if it lands after the limit.
export type SlotCaller = (
  input: SlotItemsInput,
  late: (reply: Reply) => void,
) => Promise<Reply>;

// What one ask is made of: the Plugin, its worker, the Slot and how to call the Plugin.
type Asking = {
  pluginId: string;
  worker: SlotWorker;
  entry: AnyItemsSlot;
  call: SlotCaller;
};

// A late call: the worker and change it was asked under, and the contexts it named.
type Landing = { worker: SlotWorker; epoch: number; input: SlotItemsInput };

// The one epoch guard: `write` runs only while no change signal came since `epoch` was read.
function ifCurrent(worker: SlotWorker, epoch: number, write: () => void): void {
  if (worker.epoch === epoch) write();
}

/*
 * Everything an items Slot knows of its Plugins' answers: what each worker generation kept and why it failed, and
 * each Plugin's last good items (GLOSSARY: Last good items). An answer asked for before a change signal (`drop`,
 * `askAgain`) is returned to its list but never kept, never recorded as last good, and never reported through `onChange`.
 */
export class SlotAnswers {
  private readonly workers = new Map<string, SlotWorker>();
  private readonly lastGood = new LastGoodItems();

  // `onChange` runs when a late call lands and open lists should ask again.
  constructor(private readonly onChange: () => void) {}

  // The Plugin's items for the contexts of one list: kept ones, then one call for the rest; last good items stand in.
  async ask(
    plugin: { pluginId: string; generation: number },
    input: SlotItemsInput,
    call: SlotCaller,
  ): Promise<ItemsAnswer> {
    const { pluginId, generation } = plugin;
    const worker = this.worker(pluginId, generation);
    const { epoch } = worker;

    const answer = await this.keptAnswer({ pluginId, worker, call }, input);

    if (answer.ok)
      ifCurrent(worker, epoch, () =>
        this.lastGood.record(pluginId, input, answer.items),
      );

    return answer;
  }

  // The Plugin was not asked: its last good items stand in if it answered before.
  standIn(
    pluginId: string,
    input: SlotItemsInput,
    answer: ItemsAnswer,
  ): ItemsAnswer {
    return this.lastGood.standIn(pluginId, input, answer);
  }

  // The contexts the lists show are dropped, with the failure that left their Slot out; other contexts stay kept.
  askAgain(pluginId: string, shown: readonly Shown[]): void {
    const worker = this.workers.get(pluginId);

    if (!worker) return;

    worker.epoch += 1;

    for (const list of shown) forgetShown(worker, list);
  }

  // Everything the worker kept is dropped at once; last good items stay.
  drop(pluginId: string): void {
    const worker = this.workers.get(pluginId);

    if (!worker) return;

    worker.epoch += 1;
    worker.kept.clear();
    worker.failed.clear();
  }

  // A generation that runs or ends keeps nothing of the last one.
  generationEnded(pluginId: string): void {
    this.workers.delete(pluginId);
  }

  // A Plugin turned off or removed draws nothing it answered before.
  forgetLastGood(pluginId: string): void {
    this.lastGood.forget(pluginId);
  }

  close(): void {
    this.workers.clear();
    this.lastGood.clear();
  }

  private worker(pluginId: string, generation: number): SlotWorker {
    const kept = this.workers.get(pluginId);

    if (kept?.generation === generation) return kept;

    const worker = { generation, epoch: 0, kept: new Map(), failed: new Map() };

    this.workers.set(pluginId, worker);

    return worker;
  }

  // Answers a list from what the worker kept, asking once for every context it has not answered.
  private keptAnswer(
    asking: Omit<Asking, 'entry'>,
    input: SlotItemsInput,
  ): Promise<ItemsAnswer> {
    const entry = entryOf(input);
    const failed = asking.worker.failed.get(entry.id);

    return failed && failed.reason !== itemsLeftOut.late
      ? Promise.resolve(failed)
      : this.knownAnswer({ ...asking, entry }, input);
  }

  private async knownAnswer(
    asking: Asking,
    input: SlotItemsInput,
  ): Promise<ItemsAnswer> {
    const { worker, entry } = asking;
    const kept = keptOf(worker, entry);
    const missing = missingOf(entry, kept, input);

    // While a late call is out (the one failure let by above), the contexts it lacks wait for it; kept ones answer.
    const asked =
      missing.contexts.length > 0 && worker.failed.has(entry.id)
        ? leftOut(itemsLeftOut.late)
        : await this.askMissing(asking, missing);

    if (!asked.ok) return asked;

    const known = new Map([...kept, ...Object.entries(asked.items)]);

    return { ok: true, items: itemsFor(entry, known, input) };
  }

  private async askMissing(
    { pluginId, worker, entry, call }: Asking,
    input: SlotItemsInput,
  ): Promise<ItemsAnswer> {
    if (!input.contexts.length) return { ok: true, items: {} };

    const { epoch } = worker;
    const landing: Landing = { worker, epoch, input };

    const reply = await call(input, (late) =>
      this.landed(pluginId, landing, late),
    );

    const answer = requested(entry, input, checked(entry, reply));

    ifCurrent(worker, epoch, () => remember(worker, entry, answer));

    return answer;
  }

  /*
   * A late call came to an end: kept or left out as one in time is, and asked again if it ran out at the late limit too.
   * Only while nothing changed since it was asked, so a reply older than a change signal never stands in for the answer
   * after it.
   */
  private landed(pluginId: string, landing: Landing, reply: Reply): void {
    const { worker, epoch, input } = landing;

    ifCurrent(worker, epoch, () => {
      const entry = entryOf(input);
      const answer = requested(entry, input, checked(entry, reply));

      worker.failed.delete(entry.id);

      if (answer.ok || answer.reason !== itemsLeftOut.late)
        remember(worker, entry, answer);

      if (answer.ok) this.lastGood.record(pluginId, input, answer.items);
      this.onChange();
    });
  }
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
  if (!answer.ok) {
    worker.failed.set(entry.id, answer);

    return;
  }

  for (const [key, answered] of Object.entries(answer.items))
    keptOf(worker, entry).set(key, answered);
}

// Drops what the worker kept for the contexts one list shows, and the failure that left its Slot out.
function forgetShown(
  worker: SlotWorker,
  { slotId, contexts }: Pick<SlotItemsInput, 'slotId' | 'contexts'>,
): void {
  const entry = itemsSlot(slotId);

  if (!entry) return;

  const kept = worker.kept.get(entry.id);

  for (const context of contexts) kept?.delete(contextKey(entry, context));
  worker.failed.delete(entry.id);
}
