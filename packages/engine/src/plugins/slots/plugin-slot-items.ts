import type { SlotCall } from '@repo/contracts/plugins/argo-calls';
import type { SlotItemsInput } from '@repo/contracts/plugins/wire';
import type {
  Caller,
  CallOutcome,
  Ended,
  KindCalls,
  WorkerCalls,
} from '../runtime/worker-calls';
import {
  itemsLeftOut,
  keptAnswer,
  leftOut,
  type ItemsAnswer,
  type Reply,
  type SlotWorker,
} from './kept-items';
import { SlotItemChanges } from './slot-item-changes';

// How long one batched call may take before its Plugin is left out of that answer.
const slotItemsLimitMs = 2000;

// A Plugin that is not running, or stops mid-call, is left out as not running.
const endedReason: Record<Ended, Reply> = {
  notRunning: leftOut(itemsLeftOut.notRunning),
  stopped: leftOut(itemsLeftOut.notRunning),
  late: leftOut(itemsLeftOut.late),
};

function replyOf(outcome: CallOutcome<SlotCall>): Reply {
  if ('ended' in outcome) return endedReason[outcome.ended];

  const answer = outcome.answered;

  return answer.action === 'items'
    ? { ok: true, items: answer.items }
    : leftOut(itemsLeftOut.threw);
}

/*
 * The runtime side of items Slots (ADR-0035): one batched call per Plugin and list, answers kept per
 * worker generation and Slot key until the Plugin calls `argo.changed()` or one of its Operations runs,
 * and a change count that open lists wait on.
 */
export class PluginSlotItems {
  readonly changes = new SlotItemChanges();
  private readonly kept = new Map<string, SlotWorker>();
  private readonly calls: KindCalls<SlotItemsInput, SlotCall, Reply>;

  constructor(private readonly workers: WorkerCalls) {
    this.calls = workers.kind({
      event: (id, input) => ({ type: 'slotItems', id, input }),
      limitMs: slotItemsLimitMs,
      result: replyOf,
    });
    workers.watch((pluginId) => this.generationChanged(pluginId));
  }

  // A generation that runs or ends keeps nothing of the last one, and open lists ask again.
  private generationChanged(pluginId: string): void {
    this.kept.delete(pluginId);
    this.changes.bump();
  }

  // The Plugin's items for every context of one list: kept ones, then one call for the rest.
  async items(pluginId: string, input: SlotItemsInput): Promise<ItemsAnswer> {
    const generation = this.workers.generation(pluginId);

    if (generation === undefined) return leftOut(itemsLeftOut.notRunning);

    return keptAnswer(this.worker(pluginId, generation), input, (missing) =>
      this.calls.call(pluginId, missing),
    );
  }

  private worker(pluginId: string, generation: number): SlotWorker {
    const kept = this.kept.get(pluginId);

    if (kept?.generation === generation) return kept;

    const worker = { generation, epoch: 0, kept: new Map(), failed: new Map() };

    this.kept.set(pluginId, worker);

    return worker;
  }

  // A Plugin's answer or its failure; one from an ended worker is ignored.
  receive(caller: Caller, call: SlotCall): void {
    this.calls.answer(caller, call);
  }

  // What the Plugin shows changed: nothing it answered is kept, and open lists ask it again.
  changed(pluginId: string): void {
    const worker = this.kept.get(pluginId);

    if (worker) {
      worker.epoch += 1;
      worker.kept.clear();
      worker.failed.clear();
    }

    this.changes.bump();
  }

  close(): void {
    this.kept.clear();
    this.changes.close();
  }
}
