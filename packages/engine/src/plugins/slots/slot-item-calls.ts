import type { SlotCall } from '@repo/contracts/plugins/argo-calls';
import type { PluginEvent, SlotItemsInput } from '@repo/contracts/plugins/wire';
import type { PluginClock } from '../clock';

// How long one batched call may take before its Plugin is left out of that answer.
const slotItemsLimitMs = 2000;

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

export type Caller = { pluginId: string; generation: number };

export type Reply = { ok: true; items: unknown } | LeftOut;

type Answer = Exclude<SlotCall, { action: 'changed' }>;

type Pending = Caller & { settle: (reply: Reply) => void };

export type SlotItemsTransport = {
  send: (pluginId: string, event: PluginEvent) => void;
  clock: PluginClock;
};

export const leftOut = (reason: LeftOut['reason']): LeftOut => ({
  ok: false,
  reason,
});

// The batched calls in flight, each answered by its id from the worker generation it went to.
export class SlotItemCalls {
  private readonly pending = new Map<number, Pending>();
  private next = 0;

  constructor(private readonly transport: SlotItemsTransport) {}

  call(caller: Caller, input: SlotItemsInput): Promise<Reply> {
    const id = this.next++;
    const { promise, resolve } = Promise.withResolvers<Reply>();

    const cancel = this.transport.clock.schedule(
      () => resolve(leftOut(itemsLeftOut.late)),
      slotItemsLimitMs,
    );

    this.pending.set(id, { ...caller, settle: resolve });
    this.transport.send(caller.pluginId, { type: 'slotItems', id, input });

    return promise.finally(() => {
      cancel();
      this.pending.delete(id);
    });
  }

  settle(caller: Caller, answer: Answer): void {
    const pending = this.pending.get(answer.id);

    if (!pending || !sameWorker(pending, caller)) return;
    pending.settle(replyOf(answer));
  }

  release(pluginId: string): void {
    this.leaveOut((pending) => pending.pluginId === pluginId);
  }

  close(): void {
    this.leaveOut(() => true);
  }

  private leaveOut(matches: (pending: Pending) => boolean): void {
    for (const pending of this.pending.values())
      if (matches(pending)) pending.settle(leftOut(itemsLeftOut.notRunning));
  }
}

const replyOf = (answer: Answer): Reply =>
  answer.action === 'items'
    ? { ok: true, items: answer.items }
    : leftOut(itemsLeftOut.threw);

const sameWorker = (left: Caller, right: Caller): boolean =>
  left.pluginId === right.pluginId && left.generation === right.generation;
