import type { SlotCall } from '@repo/contracts/plugins/argo-calls';
import type { SlotItemsInput } from '@repo/contracts/plugins/wire';
import type { PluginClock } from '../clock';
import type { Caller, KindCalls, WorkerCalls } from '../runtime/worker-calls';
import {
  itemsLeftOut,
  leftOut,
  type ItemsAnswer,
  type Reply,
} from './kept-items';
import { replyOf, slotItemsLateLimitMs, within } from './late-items';
import { SlotAnswers } from './slot-answers';
import { SlotItemChanges } from './slot-item-changes';
import { refreshFor, type Shown, type SlotRefresh } from './slot-refresh';

/*
 * The runtime side of items Slots (ADR-0035): one batched call per Plugin and list, answers kept per
 * worker generation and Slot key until the Plugin calls `argo.changed()` or one of its Operations runs,
 * and a change count that open lists wait on.
 */
export class PluginSlotItems {
  readonly changes = new SlotItemChanges();
  private readonly answers = new SlotAnswers(() => this.changes.bump());
  private readonly calls: KindCalls<SlotItemsInput, SlotCall, Reply>;
  // The clock of the lists that are open: one per Plugin, held for as long as an App has a list open (ADR-0052).
  readonly refresh: SlotRefresh;

  constructor(
    private readonly workers: WorkerCalls,
    private readonly clock: PluginClock,
    data: Parameters<typeof refreshFor>[1]['data'],
  ) {
    this.refresh = refreshFor(workers, { clock, data, items: this });
    this.calls = workers.kind({
      event: (id, input) => ({ type: 'slotItems', id, input }),
      limitMs: slotItemsLateLimitMs,
      result: replyOf,
    });
    workers.watch((pluginId) => this.generationChanged(pluginId));
  }

  // A generation that runs or ends keeps nothing of the last one, and open lists ask again.
  private generationChanged(pluginId: string): void {
    this.answers.generationEnded(pluginId);
    this.refresh.restarted(pluginId);
    this.changes.bump();
  }

  // The Plugin's items for every context of one list: kept ones, then one call for the rest.
  async items(pluginId: string, input: SlotItemsInput): Promise<ItemsAnswer> {
    return this.answers.standIn(
      pluginId,
      input,
      await this.answer(pluginId, input),
    );
  }

  // A Plugin turned off or removed: open lists ask again and draw nothing it answered before.
  forget(pluginId: string): void {
    this.answers.forgetLastGood(pluginId);
    this.changes.bump();
  }

  private answer(
    pluginId: string,
    input: SlotItemsInput,
  ): Promise<ItemsAnswer> {
    const generation = this.workers.generation(pluginId);

    if (generation === undefined)
      return Promise.resolve(leftOut(itemsLeftOut.notRunning));

    return this.answers.ask({ pluginId, generation }, input, (missing, late) =>
      within(this.clock, this.calls.call(pluginId, missing), late),
    );
  }

  // A Plugin's answer or its failure; one from an ended worker is ignored.
  receive(caller: Caller, call: SlotCall): void {
    this.calls.answer(caller, call);
  }

  /*
   * A list's clock ticked: what the Plugin answered for the contexts the lists show is dropped and they ask it
   * again; what it answered for any other context is kept.
   */
  askAgain(pluginId: string, shown: readonly Shown[]): void {
    this.answers.askAgain(pluginId, shown);
    this.changes.bump();
  }

  // What the Plugin answered is dropped at once, so a list opened now asks it again; open lists wake when `wake` says so.
  drop(pluginId: string): void {
    this.answers.drop(pluginId);
  }

  // Open lists ask again.
  wake(): void {
    this.changes.bump();
  }

  // What the Plugin shows changed: nothing it answered is kept, and open lists ask it again.
  changed(pluginId: string): void {
    this.drop(pluginId);
    this.wake();
  }

  close(): void {
    this.answers.close();
    this.refresh.close();
    this.changes.close();
  }
}
