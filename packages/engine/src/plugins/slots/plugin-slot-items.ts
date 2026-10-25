import type { SlotCall } from '@repo/contracts/plugins/argo-calls';
import type { SlotItemsInput } from '@repo/contracts/plugins/wire';
import { keptAnswer, type ItemsAnswer, type Worker } from './kept-items';
import {
  itemsLeftOut,
  leftOut,
  SlotItemCalls,
  type Caller,
  type SlotItemsTransport,
} from './slot-item-calls';
import { SlotItemChanges } from './slot-item-changes';

/*
 * The runtime side of items Slots (ADR-0035): one batched call per Plugin and list, answers kept per
 * worker generation and Slot key until the Plugin calls `argo.slots.changed`, and a change count that
 * open lists wait on.
 */
export class PluginSlotItems {
  readonly changes = new SlotItemChanges();
  private readonly workers = new Map<string, Worker>();
  private readonly calls;

  constructor(transport: SlotItemsTransport) {
    this.calls = new SlotItemCalls(transport);
  }

  // A new worker generation keeps nothing of the last one; lists ask it once it runs.
  activate(pluginId: string, generation: number): void {
    this.workers.set(pluginId, {
      pluginId,
      generation,
      running: false,
      epoch: 0,
      kept: new Map(),
    });
  }

  running(pluginId: string, generation: number): void {
    const worker = this.current({ pluginId, generation });

    if (!worker || worker.running) return;
    worker.running = true;
    this.changes.bump();
  }

  release(pluginId: string): void {
    if (!this.workers.delete(pluginId)) return;
    this.calls.release(pluginId);
    this.changes.bump();
  }

  // The Plugin's items for every context of one list: kept ones, then one call for the rest.
  async items(pluginId: string, input: SlotItemsInput): Promise<ItemsAnswer> {
    const worker = this.workers.get(pluginId);

    if (!worker?.running) return leftOut(itemsLeftOut.notRunning);

    return keptAnswer(worker, input, (missing) =>
      this.calls.call(worker, missing),
    );
  }

  // A Plugin's answer, its failure or its change signal; one from an ended worker is ignored.
  receive(caller: Caller, call: SlotCall): void {
    if (call.action === 'changed') this.changed(caller, call.slotId);
    else this.calls.settle(caller, call);
  }

  private changed(caller: Caller, slotId: string): void {
    const worker = this.current(caller);

    if (!worker) return;
    worker.epoch += 1;
    worker.kept.delete(slotId);
    this.changes.bump();
  }

  private current(caller: Caller): Worker | undefined {
    const worker = this.workers.get(caller.pluginId);

    return worker?.generation === caller.generation ? worker : undefined;
  }

  close(): void {
    this.calls.close();
    this.workers.clear();
    this.changes.close();
  }
}
