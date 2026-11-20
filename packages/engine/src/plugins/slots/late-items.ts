import type { SlotCall } from '@repo/contracts/plugins/argo-calls';
import type { SlotItemsInput } from '@repo/contracts/plugins/wire';
import type { PluginClock } from '../clock';
import type { CallOutcome, Ended } from '../runtime/worker-calls';
import {
  itemsLeftOut,
  keepLate,
  leftOut,
  type PluginItems,
  type Reply,
  type SlotWorker,
} from './kept-items';

// How long one batched call may take before its Plugin is left out of that answer.
export const slotItemsLimitMs = 2000;

/*
 * How long a call that ran late is still waited on. Its answer, when it lands, is kept and the open lists ask again,
 * so a Plugin that is slow on every ask still reaches them, rather than its last good items standing in for good.
 */
export const slotItemsLateLimitMs = 30_000;

// A Plugin that is not running, or stops mid-call, is left out as not running.
const endedReason: Record<Ended, Reply> = {
  notRunning: leftOut(itemsLeftOut.notRunning),
  stopped: leftOut(itemsLeftOut.notRunning),
  late: leftOut(itemsLeftOut.late),
};

// What a call came to: its items, or why its Plugin is left out.
export function replyOf(outcome: CallOutcome<SlotCall>): Reply {
  if ('ended' in outcome) return endedReason[outcome.ended];

  const answer = outcome.answered;

  return answer.action === 'items'
    ? { ok: true, items: answer.items }
    : leftOut(itemsLeftOut.threw);
}

type Resolve = (reply: Reply) => void;

type Landed = (reply: Reply) => void;

function late(resolve: Resolve, reply: Promise<Reply>, landed: Landed): void {
  resolve(leftOut(itemsLeftOut.late));
  void reply.then(landed);
}

// The call's reply, or late once it takes longer than the limit; a reply that lands after that goes to `landed`.
export function within(
  clock: PluginClock,
  reply: Promise<Reply>,
  landed: Landed,
): Promise<Reply> {
  const { promise, resolve } = Promise.withResolvers<Reply>();
  const ranLate = (): void => late(resolve, reply, landed);
  const cancel = clock.schedule(ranLate, slotItemsLimitMs);

  void reply.then((answered) => {
    cancel();
    resolve(answered);
  });

  return promise;
}

// A late call: the worker and change it was asked under, and the contexts it named.
export type Landing = {
  worker: SlotWorker;
  epoch: number;
  input: SlotItemsInput;
};

export const landingOf = (
  worker: SlotWorker,
  input: SlotItemsInput,
): Landing => ({ worker, epoch: worker.epoch, input });

const stillAsked = (
  current: SlotWorker | undefined,
  { worker, epoch }: Landing,
): boolean => current === worker && worker.epoch === epoch;

/*
 * What a late reply adds, kept by its worker: only while that worker still runs and nothing changed since it was
 * asked, so a reply older than a change signal never stands in for the answer after it.
 */
export function landedItems(
  current: SlotWorker | undefined,
  landing: Landing,
  reply: Reply,
): PluginItems | undefined {
  if (!stillAsked(current, landing)) return undefined;

  const { worker, input } = landing;
  const answer = keepLate(worker, input, reply);

  return answer.ok ? answer.items : undefined;
}
